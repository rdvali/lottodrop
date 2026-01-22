import React from 'react'
import type { PaginationData } from '../../types'
import styles from './GameHistoryPagination.module.css'

interface GameHistoryPaginationProps {
  pagination: PaginationData
  onPageChange: (page: number) => void
  loading?: boolean
  itemName?: string // Optional custom name for items (default: "games")
}

export const GameHistoryPagination: React.FC<GameHistoryPaginationProps> = ({
  pagination,
  onPageChange,
  loading = false,
  itemName = 'games'
}) => {
  const { page, totalPages, total, limit } = pagination
  
  // Calculate page range to display
  const getPageRange = () => {
    const range: (number | string)[] = []
    const maxButtons = 7 // Maximum number of page buttons to show
    
    if (totalPages <= maxButtons) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        range.push(i)
      }
    } else {
      // Always show first page
      range.push(1)
      
      if (page > 3) {
        range.push('...')
      }
      
      // Show pages around current page
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      
      for (let i = start; i <= end; i++) {
        range.push(i)
      }
      
      if (page < totalPages - 2) {
        range.push('...')
      }
      
      // Always show last page
      if (totalPages > 1) {
        range.push(totalPages)
      }
    }
    
    return range
  }
  
  const pageRange = getPageRange()
  const startItem = (page - 1) * limit + 1
  const endItem = Math.min(page * limit, total)
  
  if (totalPages <= 1) {
    return null // Don't show pagination if only one page
  }
  
  return (
    <div className={styles.paginationContainer}>
      <div className={styles.paginationInfo}>
        Showing {startItem}-{endItem} of {total} {itemName}
      </div>
      
      <div className={styles.paginationControls}>
        {/* Previous button */}
        <button
          className={`${styles.paginationButton} ${styles.navButton}`}
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || loading}
          aria-label="Previous page"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Previous
        </button>
        
        {/* Page numbers */}
        <div className={styles.pageNumbers}>
          {pageRange.map((pageNum, index) => {
            if (pageNum === '...') {
              return (
                <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                  ...
                </span>
              )
            }
            
            return (
              <button
                key={pageNum}
                className={`${styles.paginationButton} ${styles.pageButton} ${
                  page === pageNum ? styles.active : ''
                }`}
                onClick={() => onPageChange(pageNum as number)}
                disabled={loading}
                aria-label={`Go to page ${pageNum}`}
                aria-current={page === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </button>
            )
          })}
        </div>
        
        {/* Next button */}
        <button
          className={`${styles.paginationButton} ${styles.navButton}`}
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || loading}
          aria-label="Next page"
        >
          Next
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.5 15L12.5 10L7.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      
      {/* Quick jump to page */}
      {totalPages > 10 && (
        <div className={styles.quickJump}>
          <span className={styles.quickJumpLabel}>Go to page:</span>
          <input
            type="number"
            className={styles.quickJumpInput}
            min="1"
            max={totalPages}
            value={page}
            onChange={(e) => {
              const newPage = parseInt(e.target.value)
              if (newPage >= 1 && newPage <= totalPages) {
                onPageChange(newPage)
              }
            }}
            disabled={loading}
          />
          <span className={styles.quickJumpTotal}>of {totalPages}</span>
        </div>
      )}
    </div>
  )
}

export default GameHistoryPagination