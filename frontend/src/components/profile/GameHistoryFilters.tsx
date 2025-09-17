import React, { useState } from 'react'
import type { GameHistoryFilters } from '../../types'
import styles from './GameHistoryFilters.module.css'

interface GameHistoryFiltersProps {
  filters: GameHistoryFilters
  onFiltersChange: (filters: GameHistoryFilters) => void
  loading?: boolean
}

export const GameHistoryFiltersComponent: React.FC<GameHistoryFiltersProps> = ({
  filters,
  onFiltersChange,
  loading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Date preset options
  const handleDatePreset = (preset: string) => {
    const today = new Date()
    const endDate = today.toISOString().split('T')[0]
    let startDate = ''
    
    switch (preset) {
      case '7d':
        startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0]
        break
      case '30d':
        startDate = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0]
        break
      case '90d':
        startDate = new Date(today.setDate(today.getDate() - 90)).toISOString().split('T')[0]
        break
      case 'all':
        startDate = ''
        break
    }
    
    onFiltersChange({
      ...filters,
      startDate: preset === 'all' ? undefined : startDate,
      endDate: preset === 'all' ? undefined : endDate
    })
  }
  
  const handleResultFilter = (result: 'all' | 'win' | 'loss' | 'pending') => {
    onFiltersChange({
      ...filters,
      result,
      page: 1 // Reset to first page when changing filters
    })
  }
  
  const handleSortChange = (sortBy: GameHistoryFilters['sortBy']) => {
    const newSortOrder = 
      filters.sortBy === sortBy && filters.sortOrder === 'desc' 
        ? 'asc' 
        : 'desc'
    
    onFiltersChange({
      ...filters,
      sortBy,
      sortOrder: newSortOrder
    })
  }
  
  const handleLimitChange = (limit: number) => {
    onFiltersChange({
      ...filters,
      limit,
      page: 1 // Reset to first page when changing page size
    })
  }

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filtersHeader}>
        <h3 className={styles.filtersTitle}>Filters & Sorting</h3>
        <button
          className={styles.toggleButton}
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={loading}
        >
          {isExpanded ? '▼' : '▶'} {isExpanded ? 'Hide' : 'Show'} Filters
        </button>
      </div>
      
      {isExpanded && (
        <div className={styles.filtersContent}>
          {/* Date Range Section */}
          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>Date Range</label>
            <div className={styles.buttonGroup}>
              <button
                className={`${styles.presetButton} ${!filters.startDate ? styles.active : ''}`}
                onClick={() => handleDatePreset('all')}
                disabled={loading}
              >
                All Time
              </button>
              <button
                className={styles.presetButton}
                onClick={() => handleDatePreset('7d')}
                disabled={loading}
              >
                Last 7 Days
              </button>
              <button
                className={styles.presetButton}
                onClick={() => handleDatePreset('30d')}
                disabled={loading}
              >
                Last 30 Days
              </button>
              <button
                className={styles.presetButton}
                onClick={() => handleDatePreset('90d')}
                disabled={loading}
              >
                Last 90 Days
              </button>
            </div>
            
            <div className={styles.dateInputs}>
              <input
                type="date"
                className={styles.dateInput}
                value={filters.startDate || ''}
                onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                disabled={loading}
                placeholder="Start Date"
              />
              <span className={styles.dateSeparator}>to</span>
              <input
                type="date"
                className={styles.dateInput}
                value={filters.endDate || ''}
                onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                disabled={loading}
                placeholder="End Date"
              />
            </div>
          </div>
          
          {/* Result Filter Section */}
          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>Result Type</label>
            <div className={styles.buttonGroup}>
              <button
                className={`${styles.filterButton} ${filters.result === 'all' || !filters.result ? styles.active : ''}`}
                onClick={() => handleResultFilter('all')}
                disabled={loading}
              >
                All Results
              </button>
              <button
                className={`${styles.filterButton} ${styles.win} ${filters.result === 'win' ? styles.active : ''}`}
                onClick={() => handleResultFilter('win')}
                disabled={loading}
              >
                Wins Only
              </button>
              <button
                className={`${styles.filterButton} ${styles.loss} ${filters.result === 'loss' ? styles.active : ''}`}
                onClick={() => handleResultFilter('loss')}
                disabled={loading}
              >
                Losses Only
              </button>
              <button
                className={`${styles.filterButton} ${styles.pending} ${filters.result === 'pending' ? styles.active : ''}`}
                onClick={() => handleResultFilter('pending')}
                disabled={loading}
              >
                Pending
              </button>
            </div>
          </div>
          
          {/* Entry Fee Range Section */}
          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>Entry Fee Range</label>
            <div className={styles.rangeInputs}>
              <input
                type="number"
                className={styles.rangeInput}
                placeholder="Min ($)"
                value={filters.minEntryFee || ''}
                onChange={(e) => onFiltersChange({ 
                  ...filters, 
                  minEntryFee: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
                disabled={loading}
                min="0"
                step="0.01"
              />
              <span className={styles.rangeSeparator}>-</span>
              <input
                type="number"
                className={styles.rangeInput}
                placeholder="Max ($)"
                value={filters.maxEntryFee || ''}
                onChange={(e) => onFiltersChange({ 
                  ...filters, 
                  maxEntryFee: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
                disabled={loading}
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          {/* Sorting Section */}
          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>Sort By</label>
            <div className={styles.sortButtons}>
              <button
                className={`${styles.sortButton} ${filters.sortBy === 'playedAt' ? styles.active : ''}`}
                onClick={() => handleSortChange('playedAt')}
                disabled={loading}
              >
                Date {filters.sortBy === 'playedAt' && (
                  <span className={styles.sortArrow}>
                    {filters.sortOrder === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </button>
              <button
                className={`${styles.sortButton} ${filters.sortBy === 'entryFee' ? styles.active : ''}`}
                onClick={() => handleSortChange('entryFee')}
                disabled={loading}
              >
                Entry Fee {filters.sortBy === 'entryFee' && (
                  <span className={styles.sortArrow}>
                    {filters.sortOrder === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </button>
              <button
                className={`${styles.sortButton} ${filters.sortBy === 'prize' ? styles.active : ''}`}
                onClick={() => handleSortChange('prize')}
                disabled={loading}
              >
                Prize {filters.sortBy === 'prize' && (
                  <span className={styles.sortArrow}>
                    {filters.sortOrder === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </button>
              <button
                className={`${styles.sortButton} ${filters.sortBy === 'roomName' ? styles.active : ''}`}
                onClick={() => handleSortChange('roomName')}
                disabled={loading}
              >
                Room Name {filters.sortBy === 'roomName' && (
                  <span className={styles.sortArrow}>
                    {filters.sortOrder === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* Items Per Page Section */}
          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>Items Per Page</label>
            <div className={styles.buttonGroup}>
              <button
                className={`${styles.limitButton} ${filters.limit === 10 ? styles.active : ''}`}
                onClick={() => handleLimitChange(10)}
                disabled={loading}
              >
                10
              </button>
              <button
                className={`${styles.limitButton} ${filters.limit === 25 ? styles.active : ''}`}
                onClick={() => handleLimitChange(25)}
                disabled={loading}
              >
                25
              </button>
              <button
                className={`${styles.limitButton} ${filters.limit === 50 ? styles.active : ''}`}
                onClick={() => handleLimitChange(50)}
                disabled={loading}
              >
                50
              </button>
              <button
                className={`${styles.limitButton} ${filters.limit === 100 ? styles.active : ''}`}
                onClick={() => handleLimitChange(100)}
                disabled={loading}
              >
                100
              </button>
            </div>
          </div>
          
          {/* Clear Filters */}
          <div className={styles.filterActions}>
            <button
              className={styles.clearButton}
              onClick={() => onFiltersChange({
                page: 1,
                limit: 10,
                sortBy: 'playedAt',
                sortOrder: 'desc'
              })}
              disabled={loading}
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameHistoryFiltersComponent