import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      variant = 'default',
      padding = 'md',
      hoverable = false,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'bg-secondary-bg rounded-xl transition-all duration-200'
    
    const variants = {
      default: 'shadow-lg border border-primary/10',
      elevated: 'shadow-2xl',
      bordered: 'border-2 border-primary/30',
    }
    
    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }
    
    const hoverStyles = hoverable
      ? 'hover:shadow-xl hover:scale-[1.02] hover:border-primary/30'
      : ''
    
    return (
      <div
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          paddings[padding],
          hoverStyles,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card