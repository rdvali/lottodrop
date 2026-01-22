import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  /** Array of error messages for detailed validation feedback */
  errorList?: string[]
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
      errorList,
      id: providedId,
      ...props
    },
    ref
  ) => {
    // Generate unique IDs for ARIA relationships
    const generatedId = useId()
    const inputId = providedId || generatedId
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    const hasError = !!(error || (errorList && errorList.length > 0))

    const inputStyles = clsx(
      'w-full px-4 py-2 bg-primary-bg border rounded-lg text-text-primary placeholder-gray-500',
      'focus:outline-none focus:ring-2 transition-all duration-200',
      {
        'border-error focus:border-error focus:ring-error/20': hasError,
        'border-primary/30 focus:border-primary focus:ring-primary/20': !hasError,
        'pl-10': leftIcon,
        'pr-10': rightIcon,
      },
      className
    )

    const wrapperStyles = clsx('relative', fullWidth ? 'w-full' : 'inline-block')

    return (
      <div className={wrapperStyles}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1">
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
            id={inputId}
            className={inputStyles}
            aria-invalid={hasError}
            aria-describedby={
              hasError
                ? errorId
                : helperText
                ? helperId
                : undefined
            }
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Error message or error list */}
        {hasError && (
          <div id={errorId} className="mt-1 text-sm text-error" role="alert">
            {error && <p>{error}</p>}
            {errorList && errorList.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 mt-1">
                {errorList.map((errorMsg, index) => (
                  <li key={index}>{errorMsg}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Helper text (shown when no error) */}
        {helperText && !hasError && (
          <p id={helperId} className="mt-2 text-xs leading-relaxed text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input