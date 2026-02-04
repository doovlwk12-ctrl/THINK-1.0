import { Loading } from '@/components/shared/Loading'

export default function AdminOrdersLoading() {
  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
      <Loading text="جاري التحميل..." />
    </div>
  )
}
