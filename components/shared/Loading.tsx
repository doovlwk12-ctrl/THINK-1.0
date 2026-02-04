import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export function Loading({ size = 'md', text }: LoadingProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className={cn(sizes[size], 'animate-spin text-rocky-blue dark:text-rocky-blue-300')} />
      {text && <p className="text-sm text-blue-gray dark:text-greige">{text}</p>}
    </div>
  )
}
