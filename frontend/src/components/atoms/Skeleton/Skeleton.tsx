import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

const Skeleton = ({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className,
  style,
  ...props
}: SkeletonProps) => {
  const variants = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  }

  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  }

  const defaultHeights = {
    text: '1em',
    circular: '40px',
    rectangular: '100px',
    rounded: '100px',
  }

  const defaultWidths = {
    text: '100%',
    circular: '40px',
    rectangular: '100%',
    rounded: '100%',
  }

  return (
    <div
      className={clsx(
        'bg-gray-700/50',
        variants[variant],
        animations[animation],
        className
      )}
      style={{
        width: width || defaultWidths[variant],
        height: height || defaultHeights[variant],
        ...style,
      }}
      {...props}
    />
  )
}

// Card Skeleton Component
export const CardSkeleton = () => (
  <div className="bg-secondary-bg rounded-xl p-6 shadow-lg border border-primary/10">
    <div className="flex items-start justify-between mb-4">
      <div>
        <Skeleton variant="text" width="150px" height="24px" className="mb-2" />
        <Skeleton variant="text" width="100px" height="16px" />
      </div>
      <Skeleton variant="rounded" width="60px" height="24px" />
    </div>
    
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <Skeleton variant="text" width="80px" height="14px" className="mb-1" />
        <Skeleton variant="text" width="60px" height="20px" />
      </div>
      <div>
        <Skeleton variant="text" width="80px" height="14px" className="mb-1" />
        <Skeleton variant="text" width="60px" height="20px" />
      </div>
      <div>
        <Skeleton variant="text" width="80px" height="14px" className="mb-1" />
        <Skeleton variant="text" width="60px" height="20px" />
      </div>
      <div>
        <Skeleton variant="text" width="80px" height="14px" className="mb-1" />
        <Skeleton variant="text" width="60px" height="20px" />
      </div>
    </div>
    
    <Skeleton variant="rounded" width="100%" height="40px" />
  </div>
)

// Player Card Skeleton
export const PlayerCardSkeleton = () => (
  <div className="bg-secondary-bg rounded-xl p-4 shadow-lg border border-primary/10">
    <div className="flex items-center gap-3">
      <Skeleton variant="circular" width="40px" height="40px" />
      <div className="flex-1">
        <Skeleton variant="text" width="120px" height="16px" className="mb-1" />
        <Skeleton variant="text" width="80px" height="14px" />
      </div>
      <Skeleton variant="rounded" width="60px" height="24px" />
    </div>
  </div>
)

// Stat Card Skeleton
export const StatCardSkeleton = () => (
  <div className="bg-secondary-bg rounded-xl p-6 shadow-lg border border-primary/10">
    <Skeleton variant="text" width="100px" height="14px" className="mb-2" />
    <Skeleton variant="text" width="120px" height="28px" className="mb-2" />
    <Skeleton variant="text" width="80px" height="16px" />
  </div>
)

export default Skeleton