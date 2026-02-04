import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/shared/Button'
import { Home, FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-16 flex-1 flex flex-col items-center justify-center text-center max-w-md">
        <FileQuestion className="w-16 h-16 text-blue-gray dark:text-greige mb-4" aria-hidden />
        <h1 className="text-2xl font-bold text-charcoal dark:text-cream mb-2">
          الصفحة غير موجودة
        </h1>
        <p className="text-blue-gray dark:text-greige mb-6">
          لم نتمكن من العثور على الصفحة المطلوبة. تأكد من الرابط أو ارجع للصفحة الرئيسية.
        </p>
        <Link href="/">
          <Button className="inline-flex items-center gap-2">
            <Home className="w-4 h-4" />
            الصفحة الرئيسية
          </Button>
        </Link>
      </main>
    </div>
  )
}
