'use client'

import { useEffect } from 'react'
import { Button } from '@/components/shared/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error boundary:', error?.message, error?.digest)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-charcoal-900">
      <div className="text-center max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4 text-charcoal dark:text-cream">
          حدث خطأ ما
        </h1>
        <p className="text-blue-gray dark:text-greige mb-6">
          نعتذر، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button onClick={reset}>إعادة المحاولة</Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = '/'
            }}
          >
            الصفحة الرئيسية
          </Button>
        </div>
      </div>
    </div>
  )
}
