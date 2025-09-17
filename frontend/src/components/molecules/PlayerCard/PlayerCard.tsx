import { Avatar, Badge, Card } from '@components/atoms'
import clsx from 'clsx'
import type { BadgeProps } from '@components/atoms/Badge/Badge'

export interface PlayerCardProps {
  userId: string
  username: string
  status?: 'active' | 'eliminated' | 'winner' | 'waiting'
  prize?: number
  position?: number
  isCurrentUser?: boolean
  className?: string
}

const PlayerCard = ({
  userId,
  username,
  status = 'waiting',
  prize,
  position,
  isCurrentUser = false,
  className,
}: PlayerCardProps) => {
  const statusConfig: Record<string, { color: BadgeProps['variant']; label: string }> = {
    active: { color: 'success', label: 'Active' },
    eliminated: { color: 'danger', label: 'Eliminated' },
    winner: { color: 'warning', label: 'Winner' },
    waiting: { color: 'default', label: 'Waiting' },
  }
  
  const config = statusConfig[status]
  
  return (
    <Card
      padding="sm"
      hoverable
      className={clsx(
        'transition-all duration-300',
        isCurrentUser && 'ring-2 ring-primary',
        status === 'winner' && 'bg-gradient-to-r from-primary/20 to-highlight-1/20',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar
          userId={userId}
          alt={username}
          size="md"
          variant={status === 'winner' ? 'winning' : 'default'}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-text-primary truncate">
              {username}
              {isCurrentUser && <span className="text-primary ml-1">(You)</span>}
            </p>
            {position && (
              <Badge variant="primary" size="sm">
                #{position}
              </Badge>
            )}
          </div>
          
          {prize && (
            <p className="text-sm text-success font-medium mt-1">
              Won ${prize.toLocaleString()}
            </p>
          )}
        </div>
        
        <Badge variant={config.color} size="sm">
          {config.label}
        </Badge>
      </div>
    </Card>
  )
}

export default PlayerCard