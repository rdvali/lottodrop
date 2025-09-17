import type { ReactNode } from 'react'
import { Card } from '@components/atoms'
import clsx from 'clsx'

export interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

const StatCard = ({ label, value, icon, trend, className }: StatCardProps) => {
  return (
    <Card className={clsx('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          
          {trend && (
            <div className="flex items-center mt-2">
              <span
                className={clsx(
                  'text-sm font-medium',
                  trend.isPositive ? 'text-success' : 'text-error'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className="text-primary opacity-20 text-4xl">
            {icon}
          </div>
        )}
      </div>
      
      {/* Background decoration */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full" />
    </Card>
  )
}

export default StatCard