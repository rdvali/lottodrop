import { useState } from 'react'
import type { NotificationFilter } from '../../../types'
import './NotificationFilters.css'

interface NotificationFiltersProps {
  filter: NotificationFilter
  onFilterChange: (filter: Partial<NotificationFilter>) => void
}

export function NotificationFilters({ filter, onFilterChange }: NotificationFiltersProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleTypeChange = (type: string) => {
    onFilterChange({
      type: type === 'all' ? undefined : type as NotificationFilter['type']
    })
  }

  const handleSubtypeChange = (subtype: string) => {
    onFilterChange({
      subtype: subtype === 'all' ? undefined : subtype as NotificationFilter['subtype']
    })
  }

  const handlePriorityChange = (priority: string) => {
    onFilterChange({
      priority: priority === 'all' ? undefined : parseInt(priority) as NotificationFilter['priority']
    })
  }

  const handleReadStatusChange = (isRead: string) => {
    onFilterChange({
      isRead: isRead === 'all' ? undefined : isRead === 'read'
    })
  }

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    onFilterChange({
      [field]: value || undefined
    })
  }

  const clearFilters = () => {
    onFilterChange({
      type: undefined,
      subtype: undefined,
      priority: undefined,
      isRead: undefined,
      startDate: undefined,
      endDate: undefined
    })
  }

  const hasActiveFilters = Boolean(
    filter.type ||
    filter.subtype ||
    filter.priority ||
    filter.isRead !== undefined ||
    filter.startDate ||
    filter.endDate
  )

  const getActiveFilterCount = () => {
    let count = 0
    if (filter.type) count++
    if (filter.subtype) count++
    if (filter.priority) count++
    if (filter.isRead !== undefined) count++
    if (filter.startDate) count++
    if (filter.endDate) count++
    return count
  }

  return (
    <div className="notification-filters">
      <div className="notification-filters__header">
        <button
          type="button"
          className={`notification-filters__toggle ${isExpanded ? 'notification-filters__toggle--expanded' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls="notification-filters-content"
        >
          <svg
            className="notification-filters__toggle-icon"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M3 6h10l-5 5-5-5z"/>
          </svg>
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="notification-filters__active-count">
              {getActiveFilterCount()}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            className="notification-filters__clear"
            onClick={clearFilters}
            aria-label="Clear all filters"
          >
            Clear
          </button>
        )}
      </div>

      {isExpanded && (
        <div
          id="notification-filters-content"
          className="notification-filters__content"
        >
          <div className="notification-filters__grid">
            {/* Type Filter */}
            <div className="notification-filters__group">
              <label className="notification-filters__label" htmlFor="type-filter">
                Type
              </label>
              <select
                id="type-filter"
                className="notification-filters__select"
                value={filter.type || 'all'}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
                <option value="jackpot">Jackpot</option>
              </select>
            </div>

            {/* Subtype Filter */}
            <div className="notification-filters__group">
              <label className="notification-filters__label" htmlFor="subtype-filter">
                Category
              </label>
              <select
                id="subtype-filter"
                className="notification-filters__select"
                value={filter.subtype || 'all'}
                onChange={(e) => handleSubtypeChange(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="game_result">Game Results</option>
                <option value="balance_update">Balance Updates</option>
                <option value="global_win">Community Wins</option>
                <option value="round_start">Round Starts</option>
                <option value="system_alert">System Alerts</option>
                <option value="bonus">Bonuses</option>
                <option value="achievement">Achievements</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="notification-filters__group">
              <label className="notification-filters__label" htmlFor="priority-filter">
                Priority
              </label>
              <select
                id="priority-filter"
                className="notification-filters__select"
                value={filter.priority?.toString() || 'all'}
                onChange={(e) => handlePriorityChange(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="1">Critical</option>
                <option value="2">High</option>
                <option value="3">Medium</option>
                <option value="4">Low</option>
              </select>
            </div>

            {/* Read Status Filter */}
            <div className="notification-filters__group">
              <label className="notification-filters__label" htmlFor="read-status-filter">
                Status
              </label>
              <select
                id="read-status-filter"
                className="notification-filters__select"
                value={
                  filter.isRead === undefined
                    ? 'all'
                    : filter.isRead
                    ? 'read'
                    : 'unread'
                }
                onChange={(e) => handleReadStatusChange(e.target.value)}
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>

            {/* Date Range Filters */}
            <div className="notification-filters__group">
              <label className="notification-filters__label" htmlFor="start-date-filter">
                From Date
              </label>
              <input
                id="start-date-filter"
                type="date"
                className="notification-filters__date-input"
                value={filter.startDate || ''}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                max={filter.endDate || new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="notification-filters__group">
              <label className="notification-filters__label" htmlFor="end-date-filter">
                To Date
              </label>
              <input
                id="end-date-filter"
                type="date"
                className="notification-filters__date-input"
                value={filter.endDate || ''}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                min={filter.startDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="notification-filters__quick-filters">
            <h4 className="notification-filters__quick-title">Quick Filters</h4>
            <div className="notification-filters__quick-buttons">
              <button
                type="button"
                className={`notification-filters__quick-button ${filter.isRead === false ? 'notification-filters__quick-button--active' : ''}`}
                onClick={() => handleReadStatusChange('unread')}
              >
                Unread Only
              </button>
              <button
                type="button"
                className={`notification-filters__quick-button ${filter.subtype === 'game_result' ? 'notification-filters__quick-button--active' : ''}`}
                onClick={() => handleSubtypeChange('game_result')}
              >
                Game Results
              </button>
              <button
                type="button"
                className={`notification-filters__quick-button ${filter.priority === 1 ? 'notification-filters__quick-button--active' : ''}`}
                onClick={() => handlePriorityChange('1')}
              >
                Critical
              </button>
              <button
                type="button"
                className={`notification-filters__quick-button ${filter.type === 'jackpot' ? 'notification-filters__quick-button--active' : ''}`}
                onClick={() => handleTypeChange('jackpot')}
              >
                Jackpots
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationFilters