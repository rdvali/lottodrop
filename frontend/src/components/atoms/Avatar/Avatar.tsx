import { type HTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'
import { generateBotttsAvatar, type AvatarSize, type AvatarVariant } from '@utils/avatarUtils'

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'busy' | 'away'
  fallback?: string
  userId?: string // For DiceBear integration
  variant?: AvatarVariant // For avatar variant
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt = 'Avatar',
      size = 'md',
      status,
      fallback,
      userId,
      variant,
      className,
      ...props
    },
    ref
  ) => {
    const sizes = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-16 h-16 text-xl',
    }
    
    const statusSizes = {
      xs: 'w-2 h-2',
      sm: 'w-2.5 h-2.5',
      md: 'w-3 h-3',
      lg: 'w-3.5 h-3.5',
      xl: 'w-4 h-4',
    }
    
    const statusColors = {
      online: 'bg-success',
      offline: 'bg-gray-500',
      busy: 'bg-error',
      away: 'bg-warning',
    }

    // Generate DiceBear Bottts avatar URL if userId is provided
    const avatarUrl = src || (userId
      ? generateBotttsAvatar(userId, size as AvatarSize, variant || 'default')
      : undefined)
    
    return (
      <div
        ref={ref}
        className={clsx('relative inline-block', className)}
        {...props}
      >
        <div
          className={clsx(
            'rounded-full overflow-hidden bg-primary/20 flex items-center justify-center',
            sizes[size]
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={alt}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                if (target.nextSibling) {
                  (target.nextSibling as HTMLElement).style.display = 'flex'
                }
              }}
            />
          ) : null}
          
          <div
            className={clsx(
              'absolute inset-0 flex items-center justify-center text-white font-semibold',
              avatarUrl ? 'hidden' : 'flex'
            )}
          >
            {fallback || alt?.charAt(0).toUpperCase()}
          </div>
        </div>
        
        {status && (
          <span
            className={clsx(
              'absolute bottom-0 right-0 block rounded-full ring-2 ring-secondary-bg',
              statusSizes[size],
              statusColors[status]
            )}
          />
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

export default Avatar