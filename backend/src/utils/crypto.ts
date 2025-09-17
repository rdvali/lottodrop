import crypto from 'crypto';
import { seedAuditLogger } from './seedAuditLogger';

// Generate cryptographically secure random number
export const generateSecureRandom = (min: number, max: number): number => {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValue = Math.pow(256, bytesNeeded);
  const maxAcceptable = maxValue - (maxValue % range);

  let randomValue: number;
  do {
    const randomBytes = crypto.randomBytes(bytesNeeded);
    randomValue = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      randomValue = (randomValue << 8) | randomBytes[i];
    }
  } while (randomValue >= maxAcceptable);

  return min + (randomValue % range);
};

// Generate server seed for provably fair gaming with enhanced entropy
export const generateServerSeed = (roomId?: string): string => {
  // Base entropy from secure random bytes
  const randomBytes = crypto.randomBytes(32);
  
  // Add timestamp entropy (high precision)
  const timestamp = process.hrtime.bigint();
  
  // Add room context if provided
  const roomContext = roomId || 'global';
  
  // Add process-specific entropy
  const processEntropy = process.pid.toString() + Math.random().toString(36);
  
  // Combine all entropy sources
  const entropyString = `${randomBytes.toString('hex')}-${timestamp.toString()}-${roomContext}-${processEntropy}`;
  
  // Generate final seed using SHA-256 of all entropy sources
  const serverSeed = crypto.createHash('sha256').update(entropyString).digest('hex');
  
  console.log(`[Seed Generation] Room: ${roomContext}, Timestamp: ${timestamp}, Entropy Length: ${entropyString.length}, Final Seed: ${serverSeed}`);
  
  // Log seed generation for audit trail (async, don't wait)
  seedAuditLogger.logSeedGeneration({
    roomId: roomContext,
    serverSeed,
    entropySource: `randomBytes:${randomBytes.length}bytes,timestamp:${timestamp},processEntropy:${processEntropy.length}chars`,
    context: 'generateServerSeed'
  }).catch(err => console.error('[AUDIT] Failed to log seed generation:', err));
  
  return serverSeed;
};

// Generate hash for verification
export const generateHash = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Generate client seed for provably fair gaming
export const generateClientSeed = (): string => {
  const randomBytes = crypto.randomBytes(16);
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36);
  
  const clientSeed = crypto.createHash('sha256')
    .update(`${randomBytes.toString('hex')}-${timestamp}-${random}`)
    .digest('hex');
  
  console.log(`[Client Seed Generation] Generated: ${clientSeed}`);
  return clientSeed;
};

// Generate round nonce for additional entropy
export const generateRoundNonce = (roundId: string, drawTimestamp?: number): string => {
  const timestamp = drawTimestamp || Date.now();
  const randomBytes = crypto.randomBytes(8);
  
  const nonce = crypto.createHash('sha256')
    .update(`${roundId}-${timestamp}-${randomBytes.toString('hex')}`)
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for shorter nonce
  
  console.log(`[Round Nonce] Generated for round ${roundId}: ${nonce} at timestamp ${timestamp}`);
  return nonce;
};

// Select winner based on server seed, client seed, and round nonce for provably fair gaming
export const selectWinner = (
  participants: string[], 
  serverSeed: string, 
  clientSeed?: string, 
  roundNonce?: string
): { winnerIndex: number; vrfProof: any } => {
  // Ensure we have proper entropy sources
  if (!clientSeed) {
    throw new Error('Client seed is required for provably fair winner selection');
  }
  
  if (!roundNonce) {
    throw new Error('Round nonce is required for provably fair winner selection');
  }
  
  // Sort participants to ensure consistent ordering regardless of join sequence
  const sortedParticipants = [...participants].sort();
  
  // Create participant fingerprint for verification
  const participantsFingerprint = generateHash(sortedParticipants.join('|'));
  
  // Combine all entropy sources with clear separators
  const entropyString = [
    `server:${serverSeed}`,
    `client:${clientSeed}`,
    `nonce:${roundNonce}`,
    `participants:${participantsFingerprint}`,
    `count:${participants.length}`
  ].join('||');
  
  // Generate primary hash
  const primaryHash = generateHash(entropyString);
  
  // Generate secondary hash for additional security
  const secondaryHash = generateHash(`verify:${primaryHash}:${entropyString.length}`);
  
  // Combine hashes using XOR for uniform distribution
  const hash1 = BigInt('0x' + primaryHash.substring(0, 16));
  const hash2 = BigInt('0x' + primaryHash.substring(16, 32));
  const hash3 = BigInt('0x' + primaryHash.substring(32, 48));
  const hash4 = BigInt('0x' + primaryHash.substring(48, 64));
  const hash5 = BigInt('0x' + secondaryHash.substring(0, 16));
  
  // XOR all segments for maximum entropy utilization
  const combinedValue = hash1 ^ hash2 ^ hash3 ^ hash4 ^ hash5;
  
  // Select winner index
  const winnerIndex = Number(combinedValue % BigInt(participants.length));
  
  // Map back to original participant (since we sorted for consistency)
  const selectedSortedParticipant = sortedParticipants[winnerIndex];
  const originalIndex = participants.indexOf(selectedSortedParticipant);
  
  // Create VRF proof for verification
  const vrfProof = {
    serverSeed,
    clientSeed,
    roundNonce,
    participants: sortedParticipants,
    participantsFingerprint,
    entropyString,
    primaryHash,
    secondaryHash,
    combinedValue: combinedValue.toString(),
    winnerIndex: originalIndex,
    winnerId: participants[originalIndex],
    timestamp: Date.now()
  };
  
  console.log('[VRF Algorithm] Server Seed:', serverSeed);
  console.log('[VRF Algorithm] Client Seed:', clientSeed);
  console.log('[VRF Algorithm] Round Nonce:', roundNonce);
  console.log('[VRF Algorithm] Participants (sorted):', sortedParticipants);
  console.log('[VRF Algorithm] Participants Fingerprint:', participantsFingerprint);
  console.log('[VRF Algorithm] Entropy String:', entropyString);
  console.log('[VRF Algorithm] Primary Hash:', primaryHash);
  console.log('[VRF Algorithm] Secondary Hash:', secondaryHash);
  console.log('[VRF Algorithm] Combined Value:', combinedValue.toString());
  console.log('[VRF Algorithm] Winner Index (in original order):', originalIndex);
  console.log('[VRF Algorithm] Winner ID:', participants[originalIndex]);
  
  return { winnerIndex: originalIndex, vrfProof };
};

// Verify VRF proof for transparency and audit
export const verifyVRFProof = (vrfProof: any): boolean => {
  try {
    const {
      serverSeed,
      clientSeed,
      roundNonce,
      participants,
      participantsFingerprint,
      entropyString,
      primaryHash,
      secondaryHash,
      combinedValue,
      winnerIndex,
      winnerId
    } = vrfProof;

    // Verify participant fingerprint
    const expectedFingerprint = generateHash(participants.join('|'));
    if (expectedFingerprint !== participantsFingerprint) {
      console.error('[VRF Verification] Participant fingerprint mismatch');
      return false;
    }

    // Verify entropy string construction
    const expectedEntropyString = [
      `server:${serverSeed}`,
      `client:${clientSeed}`,
      `nonce:${roundNonce}`,
      `participants:${participantsFingerprint}`,
      `count:${participants.length}`
    ].join('||');

    if (expectedEntropyString !== entropyString) {
      console.error('[VRF Verification] Entropy string mismatch');
      return false;
    }

    // Verify primary hash
    const expectedPrimaryHash = generateHash(entropyString);
    if (expectedPrimaryHash !== primaryHash) {
      console.error('[VRF Verification] Primary hash mismatch');
      return false;
    }

    // Verify secondary hash
    const expectedSecondaryHash = generateHash(`verify:${primaryHash}:${entropyString.length}`);
    if (expectedSecondaryHash !== secondaryHash) {
      console.error('[VRF Verification] Secondary hash mismatch');
      return false;
    }

    // Verify combined value calculation
    const hash1 = BigInt('0x' + primaryHash.substring(0, 16));
    const hash2 = BigInt('0x' + primaryHash.substring(16, 32));
    const hash3 = BigInt('0x' + primaryHash.substring(32, 48));
    const hash4 = BigInt('0x' + primaryHash.substring(48, 64));
    const hash5 = BigInt('0x' + secondaryHash.substring(0, 16));
    
    const expectedCombinedValue = hash1 ^ hash2 ^ hash3 ^ hash4 ^ hash5;
    if (expectedCombinedValue.toString() !== combinedValue) {
      console.error('[VRF Verification] Combined value mismatch');
      return false;
    }

    // Verify winner selection
    const expectedWinnerIndex = Number(expectedCombinedValue % BigInt(participants.length));
    if (expectedWinnerIndex !== winnerIndex) {
      console.error('[VRF Verification] Winner index mismatch');
      return false;
    }

    // Verify winner ID
    if (participants[winnerIndex] !== winnerId) {
      console.error('[VRF Verification] Winner ID mismatch');
      return false;
    }

    console.log('[VRF Verification] All checks passed - proof is valid');
    return true;
  } catch (error) {
    console.error('[VRF Verification] Error during verification:', error);
    return false;
  }
};

// Generate unique share code for rooms
export const generateShareCode = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = generateSecureRandom(0, characters.length - 1);
    code += characters[randomIndex];
  }
  return code;
};