import type { ReactNode, MouseEventHandler } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: MouseEventHandler<HTMLDivElement>
}

export function Card({ children, className = '', padding = 'md', onClick }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-charcoal-800 rounded-none shadow-soft dark:shadow-medium',
        'border-2 border-greige/30 dark:border-charcoal-600',
        'transition-all duration-200',
        paddings[padding], 
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
