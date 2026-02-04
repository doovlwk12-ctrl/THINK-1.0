'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Loading } from '@/components/shared/Loading'

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

export default function CreateOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
          <Loading text="جاري التحميل..." />
        </div>
      }
    >
      <CreateOrderContent />
    </Suspense>
  )
}
