import crypto from 'crypto';
import pool from '../config/database';

interface Winner {
  userId: string;
  position: number;
  prizeAmount: number;
}

interface PrizeDistribution {
  position: number;
  prizeAmount: number;
}

/**
 * Select multiple winners using VRF (Verifiable Random Function)
 * Ensures provable fairness for multiple winner selection
 */
export const selectMultipleWinners = (
  participants: string[],
  serverSeed: string,
  numberOfWinners: number
): number[] => {
  // Ensure we don't select more winners than participants
  const actualWinnerCount = Math.min(numberOfWinners, participants.length);
  
  const winners: number[] = [];
  const selectedIndices = new Set<number>();
  
  // Generate unique winners using VRF
  for (let i = 0; i < actualWinnerCount; i++) {
    let attempts = 0;
    let winnerIndex: number;
    
    do {
      // Create unique seed for each winner position
      const positionSeed = `${serverSeed}:position_${i + 1}:attempt_${attempts}`;
      const hash = crypto.createHash('sha256').update(positionSeed).digest('hex');
      
      // Convert hash to number and get index
      const hashInt = BigInt('0x' + hash.slice(0, 16));
      const availableIndices = participants.length - selectedIndices.size;
      
      // Map to available participant index
      let targetPosition = Number(hashInt % BigInt(availableIndices));
      
      // Skip already selected indices
      winnerIndex = 0;
      let count = 0;
      while (count <= targetPosition || selectedIndices.has(winnerIndex)) {
        if (!selectedIndices.has(winnerIndex)) {
          if (count === targetPosition) {
            break;
          }
          count++;
        }
        winnerIndex++;
        if (winnerIndex >= participants.length) {
          winnerIndex = 0;
        }
      }
      
      attempts++;
      // Safety check to prevent infinite loop
      if (attempts > 1000) {
        throw new Error('Failed to select unique winners');
      }
    } while (selectedIndices.has(winnerIndex));
    
    selectedIndices.add(winnerIndex);
    winners.push(winnerIndex);
  }
  
  return winners;
};

/**
 * Calculate prize distribution among multiple winners
 */
export const calculatePrizeDistribution = (
  totalPrize: number,
  platformFeeRate: number,  // This is expected as a decimal (0.1 for 10%)
  numberOfWinners: number,
  distributionType: 'equal' | 'weighted' = 'equal'
): PrizeDistribution[] => {
  const netPrize = totalPrize * (1 - platformFeeRate);
  const distributions: PrizeDistribution[] = [];
  
  if (distributionType === 'equal') {
    // Equal distribution - all winners get the same amount
    const equalAmount = Math.floor((netPrize * 100) / numberOfWinners) / 100;
    
    for (let i = 0; i < numberOfWinners; i++) {
      distributions.push({
        position: i + 1,
        prizeAmount: equalAmount
      });
    }
  } else {
    // Weighted distribution based on position
    const weights = getDistributionWeights(numberOfWinners);
    let totalDistributed = 0;
    
    for (let i = 0; i < numberOfWinners - 1; i++) {
      const amount = Math.floor(netPrize * weights[i] * 100) / 100;
      distributions.push({
        position: i + 1,
        prizeAmount: amount
      });
      totalDistributed += amount;
    }
    
    // Last winner gets the remainder to ensure exact total
    distributions.push({
      position: numberOfWinners,
      prizeAmount: netPrize - totalDistributed
    });
  }
  
  return distributions;
};

/**
 * Get distribution weights based on number of winners
 */
const getDistributionWeights = (numberOfWinners: number): number[] => {
  switch (numberOfWinners) {
    case 1:
      return [1.0];
    case 2:
      return [0.65, 0.35];
    case 3:
      return [0.50, 0.30, 0.20];
    case 4:
      return [0.40, 0.30, 0.20, 0.10];
    case 5:
      return [0.35, 0.25, 0.20, 0.12, 0.08];
    default:
      // For more than 5 winners, use equal distribution
      const equalWeight = 1 / numberOfWinners;
      return Array(numberOfWinners).fill(equalWeight);
  }
};

/**
 * Process multiple round winners
 */
export const processMultipleRoundWinners = async (roomId: string) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current round
    const roundResult = await client.query(
      `SELECT gr.*, r.number_of_winners, r.platform_fee_rate, r.name as room_name
       FROM game_rounds gr
       JOIN rooms r ON gr.room_id = r.id
       WHERE gr.room_id = $1 AND gr.completed_at IS NULL AND gr.archived_at IS NULL
       FOR UPDATE`,
      [roomId]
    );
    
    if (roundResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    
    const round = roundResult.rows[0];
    
    // Get all participants
    const participantsResult = await client.query(
      'SELECT user_id FROM round_participants WHERE round_id = $1',
      [round.id]
    );
    
    if (participantsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    
    const participants = participantsResult.rows.map((p: any) => p.user_id);
    const numberOfWinners = Math.min(round.number_of_winners || 1, participants.length);
    
    // Select multiple winners using VRF
    console.log(`[Multi-Winner VRF] Selecting ${numberOfWinners} winners from ${participants.length} participants`);
    const winnerIndices = selectMultipleWinners(participants, round.server_seed, numberOfWinners);
    
    // Calculate prize distribution
    const prizePool = parseFloat(round.prize_pool);
    const platformFeeRate = parseFloat(round.platform_fee_rate);

    console.log('[Multi-Winner Prize] Room:', roomId);
    console.log('[Multi-Winner Prize] Prize Pool:', prizePool);
    console.log('[Multi-Winner Prize] Platform Fee Rate (decimal):', platformFeeRate);
    console.log('[Multi-Winner Prize] Number of Winners:', numberOfWinners);

    const distributions = calculatePrizeDistribution(
      prizePool,
      platformFeeRate,
      numberOfWinners,
      'equal' // Equal distribution for all winners
    );

    // Calculate platform fee (platform_fee_rate is already a decimal, e.g., 0.1 for 10%)
    const platformFeeAmount = prizePool * platformFeeRate;

    console.log('[Multi-Winner Prize] Platform Fee Amount:', platformFeeAmount);
    console.log('[Multi-Winner Prize] Total to Distribute:', prizePool - platformFeeAmount);
    console.log('[Multi-Winner Prize] Per Winner:', distributions[0]?.prizeAmount);
    
    // Process each winner
    const winners: Winner[] = [];
    for (let i = 0; i < winnerIndices.length; i++) {
      const winnerId = participants[winnerIndices[i]];
      const distribution = distributions[i];
      
      // Insert into round_winners table
      await client.query(
        `INSERT INTO round_winners (round_id, user_id, position, prize_amount)
         VALUES ($1, $2, $3, $4)`,
        [round.id, winnerId, distribution.position, distribution.prizeAmount]
      );
      
      // Update participant record
      await client.query(
        `UPDATE round_participants 
         SET is_winner = true, winner_position = $1, prize_won = $2, won_amount = $2
         WHERE round_id = $3 AND user_id = $4`,
        [distribution.position, distribution.prizeAmount, round.id, winnerId]
      );
      
      // Update user balance
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [distribution.prizeAmount, winnerId]
      );
      
      // Create transaction record
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, status, reference_id, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          winnerId,
          'WIN',
          distribution.prizeAmount,
          'SUCCESS',
          round.id,
          `Game winnings - Position ${distribution.position} in ${round.room_name}`
        ]
      );
      
      winners.push({
        userId: winnerId,
        position: distribution.position,
        prizeAmount: distribution.prizeAmount
      });
    }
    
    // Generate result hash for verification
    const resultData = winners
      .sort((a, b) => a.position - b.position)
      .map(w => `${w.position}:${w.userId}:${w.prizeAmount}`)
      .join('|');
    const resultHash = crypto.createHash('sha256')
      .update(`${round.server_seed}:${resultData}`)
      .digest('hex');
    
    // Update game round
    await client.query(
      `UPDATE game_rounds 
       SET total_winners = $1, platform_fee_amount = $2, result_hash = $3, 
           completed_at = NOW(), winner_id = $4
       WHERE id = $5`,
      [numberOfWinners, platformFeeAmount, resultHash, winners[0].userId, round.id]
    );
    
    // Update room status
    await client.query(
      'UPDATE rooms SET status = $1 WHERE id = $2',
      ['COMPLETED', roomId]
    );
    
    await client.query('COMMIT');
    
    console.log(`[Multi-Winner VRF] Successfully processed ${winners.length} winners`);
    
    return {
      winners,
      totalPrize: parseFloat(round.prize_pool),
      platformFeeAmount,
      resultHash
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Multi-Winner VRF] Error processing winners:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Generate verification proof for multi-winner selection
 */
export const generateMultiWinnerProof = (
  serverSeed: string,
  participants: string[],
  winners: Winner[]
): string => {
  const data = {
    serverSeed,
    participants,
    winners: winners.sort((a, b) => a.position - b.position),
    timestamp: new Date().toISOString()
  };
  
  return crypto.createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
};