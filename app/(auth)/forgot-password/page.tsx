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
import { ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

const forgotSchema = z.object({
  email: z.string().min(1, 'البريد الإلكتروني مطلوب').email('البريد الإلكتروني غير صحيح'),
})

type ForgotInput = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (_data: ForgotInput) => {
    setLoading(true)
    try {
      // NextAuth/Prisma: لا يوجد إرسال بريد مفعّل — نوجّه المستخدم للدعم
      setSent(true)
      toast.success('تم استلام طلبك. تواصل مع الدعم الفني لإعادة تعيين كلمة المرور.')
    } catch {
      toast.error('حدث خطأ. جرّب لاحقاً أو تواصل مع الدعم')
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
            <Mail className="w-6 h-6 text-rocky-blue dark:text-rocky-blue-300" />
          </div>
          <h1 className="text-2xl font-bold text-charcoal dark:text-cream">نسيت كلمة المرور</h1>
        </div>

        <p className="text-sm text-blue-gray dark:text-greige mb-6 text-center">
          أدخل البريد الإلكتروني المرتبط بحسابك. سنرسل لك رابطاً لإعادة تعيين كلمة المرور.
        </p>

        {sent ? (
          <div className="rounded-lg bg-rocky-blue/10 dark:bg-rocky-blue/20 border border-rocky-blue/30 p-4 text-center text-charcoal dark:text-cream text-sm">
            تم استلام طلبك. للاستفسار أو إعادة تعيين كلمة المرور تواصل مع الدعم الفني.
            <p className="mt-4">
              <Link href="/login" className="text-rocky-blue dark:text-rocky-blue-300 font-semibold hover:underline">
                العودة لتسجيل الدخول
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              {...register('email')}
              type="email"
              label="البريد الإلكتروني"
              placeholder="example@email.com"
              error={errors.email?.message}
            />
            <Button type="submit" loading={loading} className="w-full">
              إرسال رابط إعادة التعيين
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-blue-gray dark:text-greige">
          تذكرت كلمة المرور؟{' '}
          <Link href="/login" className="text-rocky-blue dark:text-rocky-blue-300 hover:underline font-semibold">
            تسجيل الدخول
          </Link>
        </p>
      </Card>
    </div>
  )
}
