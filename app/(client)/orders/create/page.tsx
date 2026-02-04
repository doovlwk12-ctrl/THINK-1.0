'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Loading } from '@/components/shared/Loading'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Button } from '@/components/shared/Button'

const CreateOrderContent = dynamic(
  () => import('./CreateOrderContent').then((m) => ({ default: m.CreateOrderContent })),
  {
    loading: () => (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    ),
    ssr: false,
  }
)

const createOrderFallback = (
  <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center p-4">
    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center max-w-md">
      <p className="text-charcoal dark:text-cream font-medium mb-2">تعذر تحميل النموذج</p>
      <p className="text-sm text-blue-gray dark:text-greige mb-4">حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.</p>
      <Button onClick={() => window.location.reload()}>إعادة المحاولة</Button>
    </div>
  </div>
)

export default function CreateOrderPage() {
  return (
    <ErrorBoundary fallback={createOrderFallback}>
      <Suspense
        fallback={
          <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
            <Loading text="جاري التحميل..." />
          </div>
        }
      >
        <CreateOrderContent />
      </Suspense>
    </ErrorBoundary>
  )
}
