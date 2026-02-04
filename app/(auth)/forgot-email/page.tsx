'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Card } from '@/components/shared/Card'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { ArrowLeft, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api'

const forgotEmailSchema = z.object({
  phone: z.string().min(10, 'رقم الجوال يجب أن يكون 10 أرقام على الأقل').max(15, 'رقم الجوال طويل جداً'),
})

type ForgotEmailInput = z.infer<typeof forgotEmailSchema>

export default function ForgotEmailPage() {
  const [result, setResult] = useState<{ emailHint?: string; message?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotEmailInput>({
    resolver: zodResolver(forgotEmailSchema),
  })

  const onSubmit = async (data: ForgotEmailInput) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await apiClient.post<{ success: boolean; emailHint?: string; message?: string; error?: string }>(
        '/auth/forgot-email',
        { phone: data.phone.trim() }
      )
      if (res?.error) {
        toast.error(res.error)
        return
      }
      setResult({ emailHint: res?.emailHint, message: res?.message })
      if (res?.emailHint) {
        toast.success('تم العثور على تلميح البريد المرتبط برقمك')
      } else {
        toast.success('إذا كان الرقم مسجلاً، ستظهر تلميح البريد أعلاه. وإلا تواصل مع الدعم الفني.')
      }
    } catch {
      toast.error('حدث خطأ. جرّب لاحقاً أو تواصل مع الدعم الفني.')
    } finally {
      setLoading(false)
    }
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
            <Phone className="w-6 h-6 text-rocky-blue dark:text-rocky-blue-300" />
          </div>
          <h1 className="text-2xl font-bold text-charcoal dark:text-cream">نسيت البريد الإلكتروني</h1>
        </div>

        <p className="text-sm text-blue-gray dark:text-greige mb-6 text-center">
          أدخل رقم الجوال المرتبط بحسابك. سنعرض لك تلميحاً عن بريدك (بدون كشف البريد الكامل) لمساعدتك على تذكّره.
        </p>

        {result?.emailHint ? (
          <div className="rounded-lg bg-rocky-blue/10 dark:bg-rocky-blue/20 border border-rocky-blue/30 p-4 text-center">
            <p className="text-sm text-charcoal dark:text-cream mb-2">{result.message}</p>
            <p className="text-lg font-bold text-rocky-blue dark:text-rocky-blue-300 font-mono" dir="ltr">
              {result.emailHint}
            </p>
            <p className="mt-3 text-xs text-blue-gray dark:text-greige">
              استخدم هذا التلميح لتذكّر بريدك ثم جرّب تسجيل الدخول.
            </p>
            <p className="mt-4">
              <Link href="/login" className="text-rocky-blue dark:text-rocky-blue-300 font-semibold hover:underline">
                العودة لتسجيل الدخول
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              {...register('phone')}
              type="tel"
              label="رقم الجوال"
              placeholder="05xxxxxxxx"
              error={errors.phone?.message}
            />
            <Button type="submit" loading={loading} className="w-full">
              عرض تلميح البريد
            </Button>
          </form>
        )}

        {!result?.emailHint && (
          <p className="mt-6 text-center text-sm text-blue-gray dark:text-greige">
            تذكرت بريدك؟{' '}
            <Link href="/login" className="text-rocky-blue dark:text-rocky-blue-300 hover:underline font-semibold">
              تسجيل الدخول
            </Link>
          </p>
        )}

        {result && !result.emailHint && (
          <p className="mt-4 text-center text-sm text-blue-gray dark:text-greige">
            لم يظهر تلميح؟ قد يكون الرقم غير مسجّل.{' '}
            <Link href="/login" className="text-rocky-blue dark:text-rocky-blue-300 hover:underline">
              تسجيل الدخول
            </Link>
            {' '}
            أو تواصل مع الدعم الفني.
          </p>
        )}
      </Card>
    </div>
  )
}
