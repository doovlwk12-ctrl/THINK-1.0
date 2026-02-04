'use client'

import { MapPin } from 'lucide-react'
import type { ParsedModificationPoint } from '@/lib/parseModificationPointMessage'

interface ModificationPointMessageProps {
  data: ParsedModificationPoint
  /** When true, message is from client (align right in RTL). */
  isFromClient: boolean
  className?: string
}

export function ModificationPointMessage({
  data,
  isFromClient,
  className = '',
}: ModificationPointMessageProps) {
  const { pinIndex, location, note } = data

  return (
    <div
      className={`
        rounded-2xl shadow-sm border-2 px-4 py-3 max-w-[75%] md:max-w-md
        ${isFromClient
          ? 'bg-rocky-blue dark:bg-rocky-blue-600 text-cream border-rocky-blue dark:border-rocky-blue-500 rounded-tr-sm'
          : 'bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream border-greige/40 dark:border-charcoal-600 rounded-tl-sm'
        }
        ${className}
      `}
    >
      <div className="flex items-start gap-2">
        <MapPin
          className="flex-shrink-0 w-5 h-5 mt-0.5"
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm mb-1">
            نقطة التعديل #{pinIndex}
          </p>
          <p className="text-xs opacity-90 mb-2">
            الموقع: ({location})
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {note}
          </p>
        </div>
      </div>
    </div>
  )
}
