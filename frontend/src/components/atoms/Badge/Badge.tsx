import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      className,
      variant = 'default',
      size = 'md',
      dot = false,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full'
    
    const variants = {
      default: 'bg-gray-600 text-gray-100',
      primary: 'bg-primary text-white',
      secondary: 'bg-secondary text-text-primary',
      success: 'bg-green-600 text-white',
      warning: 'bg-warning text-black',
      danger: 'bg-error text-white',
      info: 'bg-info text-white',
    }
    
    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    }
    
    return (
      <span
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span className="w-2 h-2 bg-current rounded-full mr-1.5" />
        )}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export default Badge