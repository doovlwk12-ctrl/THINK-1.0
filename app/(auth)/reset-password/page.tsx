'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Card } from '@/components/shared/Card'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Loading } from '@/components/shared/Loading'
import { ArrowLeft, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCheckingSession(false)
      setHasRecoverySession(!!session?.user)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = password.trim()
    const c = confirmPassword.trim()
    if (p.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    if (p !== c) {
      toast.error('كلمات المرور غير متطابقة')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: p })
      if (error) {
        toast.error(error.message)
        return
      }
      setSubmitSuccess(true)
      toast.success('تم تغيير كلمة المرور بنجاح')
      await new Promise((r) => setTimeout(r, 800))
      router.replace('/login')
    } catch {
      toast.error('حدث خطأ. جرّب لاحقاً.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center p-4">
        <Loading text="جاري التحقق..." />
      </div>
    )
  }

  if (!hasRecoverySession) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md dark:bg-charcoal-800 dark:border-charcoal-600">
          <div className="flex items-center justify-between gap-3 mb-6">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-rocky-blue dark:text-rocky-blue-300 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              العودة لتسجيل الدخول
            </Link>
            <ThemeToggle />
          </div>
          <div className="text-center py-6">
            <p className="text-charcoal dark:text-cream mb-4">
              استخدم الرابط المرسل إلى بريدك الإلكتروني لإعادة تعيين كلمة المرور. إن فتحت هذه الصفحة مباشرة فلن تتمكن من تعيين كلمة مرور جديدة هنا.
            </p>
            <Link href="/forgot-password">
              <Button variant="outline">طلب رابط إعادة التعيين</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center p-4">
        <Loading text="جاري التحويل لتسجيل الدخول..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md dark:bg-charcoal-800 dark:border-charcoal-600">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-rocky-blue dark:text-rocky-blue-300 hover:underline">
            <ArrowLeft className="w-4 h-4" />
            العودة لتسجيل الدخول
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-rocky-blue/10 dark:bg-rocky-blue/20 flex items-center justify-center border-2 border-rocky-blue/30">
            <Lock className="w-6 h-6 text-rocky-blue dark:text-rocky-blue-300" />
          </div>
          <h1 className="text-2xl font-bold text-charcoal dark:text-cream">تعيين كلمة مرور جديدة</h1>
        </div>

        <p className="text-sm text-blue-gray dark:text-greige mb-6 text-center">
          أدخل كلمة المرور الجديدة لحسابك.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="password"
            label="كلمة المرور الجديدة"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
          />
          <Input
            type="password"
            label="تأكيد كلمة المرور"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button type="submit" loading={loading} className="w-full">
            حفظ كلمة المرور
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-blue-gray dark:text-greige">
          <Link href="/login" className="text-rocky-blue dark:text-rocky-blue-300 hover:underline font-semibold">
            تسجيل الدخول
          </Link>
        </p>
      </Card>
    </div>
  )
}
