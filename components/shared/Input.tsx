import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-charcoal dark:text-cream mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 border-2 rounded-none focus:ring-2 focus:ring-rocky-blue focus:border-rocky-blue transition-all duration-200',
            'bg-white dark:bg-charcoal-800 text-charcoal dark:text-cream',
            'border-greige/50 dark:border-charcoal-600',
            'placeholder:text-blue-gray/60 dark:placeholder:text-greige/60',
            'text-start',
            error ? 'border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500' : '',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-start gap-1">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
