'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Button } from './Button'

interface BackButtonProps {
  href?: string
  onClick?: () => void
  className?: string
  label?: string
}

export function BackButton({ href, onClick, className = '', label = 'العودة' }: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (href) {
      router.push(href)
    } else {
      router.back()
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className={className}
    >
      <ArrowRight className="w-4 h-4" />
      {label}
    </Button>
  )
}
