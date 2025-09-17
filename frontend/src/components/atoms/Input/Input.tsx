import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const inputStyles = clsx(
      'w-full px-4 py-2 bg-primary-bg border rounded-lg text-text-primary placeholder-gray-500',
      'focus:outline-none focus:ring-2 transition-all duration-200',
      {
        'border-error focus:border-error focus:ring-error/20': error,
        'border-primary/30 focus:border-primary focus:ring-primary/20': !error,
        'pl-10': leftIcon,
        'pr-10': rightIcon,
      },
      className
    )
    
    const wrapperStyles = clsx('relative', fullWidth ? 'w-full' : 'inline-block')
    
    return (
      <div className={wrapperStyles}>
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            className={inputStyles}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p className="mt-1 text-sm text-error">{error}</p>
        )}
        
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-400">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input