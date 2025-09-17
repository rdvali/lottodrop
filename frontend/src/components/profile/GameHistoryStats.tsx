import React from 'react'
import type { GameStatistics } from '../../types'
import styles from './GameHistoryStats.module.css'

interface GameHistoryStatsProps {
  statistics: GameStatistics
  loading?: boolean
}

interface StatCardProps {
  title: string
  value: string | number
  icon: string
  variant?: 'default' | 'success' | 'danger' | 'warning'
  prefix?: string
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  variant = 'default',
  prefix = ''
}) => {
  return (
    <div className={`${styles.statCard} ${styles[variant]}`}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statContent}>
        <div className={styles.statTitle}>{title}</div>
        <div className={styles.statValue}>
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      </div>
    </div>
  )
}

export const GameHistoryStats: React.FC<GameHistoryStatsProps> = ({ 
  statistics, 
  loading = false 
}) => {
  if (loading) {
    return (
      <div className={styles.statsContainer}>
        <div className={styles.statsGrid}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`${styles.statCard} ${styles.loading}`}>
              <div className={styles.skeleton}></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const netProfit = statistics.totalWinnings - statistics.totalSpent
  const profitVariant = netProfit >= 0 ? 'success' : 'danger'

  return (
    <div className={styles.statsContainer}>
      <h3 className={styles.statsTitle}>Gaming Statistics</h3>
      <div className={styles.statsGrid}>
        <StatCard
          title="Total Games"
          value={statistics.totalGames}
          icon="🎮"
          variant="default"
        />
        
        <StatCard
          title="Games Won"
          value={statistics.totalWon}
          icon="🏆"
          variant="success"
        />
        
        <StatCard
          title="Win Rate"
          value={`${statistics.winRate.toFixed(1)}%`}
          icon="📊"
          variant={statistics.winRate > 50 ? 'success' : 'warning'}
        />
        
        <StatCard
          title="Total Winnings"
          value={statistics.totalWinnings.toFixed(2)}
          icon="💰"
          variant="success"
          prefix="$"
        />
        
        <StatCard
          title="Total Spent"
          value={statistics.totalSpent.toFixed(2)}
          icon="💸"
          variant="default"
          prefix="$"
        />
        
        <StatCard
          title="Net Profit"
          value={Math.abs(netProfit).toFixed(2)}
          icon={netProfit >= 0 ? '📈' : '📉'}
          variant={profitVariant}
          prefix={netProfit >= 0 ? '+$' : '-$'}
        />
        
        <StatCard
          title="Biggest Win"
          value={statistics.biggestWin.toFixed(2)}
          icon="🎯"
          variant="warning"
          prefix="$"
        />
        
        <StatCard
          title="Avg Entry Fee"
          value={statistics.averageEntryFee.toFixed(2)}
          icon="🎟️"
          variant="default"
          prefix="$"
        />
      </div>
    </div>
  )
}

export default GameHistoryStats