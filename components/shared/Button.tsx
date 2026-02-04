import { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-bold rounded-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rocky-blue focus-visible:ring-offset-2 dark:focus-visible:ring-offset-charcoal-900'
  
  const variants = {
    primary: 'bg-rocky-blue dark:bg-rocky-blue-500 text-cream hover:bg-rocky-blue-600 dark:hover:bg-rocky-blue-400 shadow-hard hover:shadow-hard-lg',
    secondary: 'bg-greige/30 dark:bg-charcoal-700 text-charcoal dark:text-cream hover:bg-greige/50 dark:hover:bg-charcoal-600 border-2 border-greige/50 dark:border-charcoal-600',
    outline: 'border-2 border-rocky-blue dark:border-rocky-blue-400 text-rocky-blue dark:text-rocky-blue-300 hover:bg-rocky-blue hover:text-cream dark:hover:bg-rocky-blue-600 dark:hover:text-cream',
    danger: 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 shadow-hard hover:shadow-hard-lg',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 min-h-[2.75rem] text-xs sm:text-sm',
    md: 'px-4 py-2.5 min-h-[2.75rem] text-sm sm:text-base',
    lg: 'px-6 py-3 text-base sm:text-lg',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
