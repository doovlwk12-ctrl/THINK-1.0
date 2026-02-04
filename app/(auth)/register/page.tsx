'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterInput } from '@/schemas/userSchema'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Card } from '@/components/shared/Card'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Loading } from '@/components/shared/Loading'
import { Home } from 'lucide-react'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'

const useSupabaseAuth = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === 'true'

export default function RegisterPage() {
  const router = useRouter()
  const { data: session, status, signIn } = useAuth()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session?.user) {
      const path =
        session.user.role === 'ADMIN'
          ? '/admin/dashboard'
          : session.user.role === 'ENGINEER'
            ? '/engineer/dashboard'
            : '/dashboard'
      window.location.href = path
    }
  }, [session])

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema)
  })

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true)
    try {
      const userData = { name: data.name, email: data.email, phone: data.phone, password: data.password }
      const result = await apiClient.post<{ success: boolean; user?: unknown }>('/auth/register', userData)

      if (result.success) {
        toast.success('تم إنشاء الحساب بنجاح')
        if (useSupabaseAuth) {
          const signInResult = await signIn(data.email, data.password)
          if (signInResult?.ok && signInResult?.user) {
            const path =
              signInResult.user.role === 'ADMIN'
                ? '/admin/dashboard'
                : signInResult.user.role === 'ENGINEER'
                  ? '/engineer/dashboard'
                  : '/dashboard'
            await new Promise((r) => setTimeout(r, 300))
            window.location.href = path
            return
          }
          if (signInResult?.error) {
            toast(signInResult.error, { icon: 'ℹ️' })
          }
        }
        router.push('/login')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل إنشاء الحساب'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream via-cream to-greige/20 dark:from-charcoal-900 dark:via-charcoal-800 dark:to-charcoal-900 flex items-center justify-center p-4">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  if (status === 'authenticated' && session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream via-cream to-greige/20 dark:from-charcoal-900 dark:via-charcoal-800 dark:to-charcoal-900 flex items-center justify-center p-4">
        <Loading text="جاري التحويل للوحة التحكم..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-cream to-greige/20 dark:from-charcoal-900 dark:via-charcoal-800 dark:to-charcoal-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md dark:bg-charcoal-800 dark:border-charcoal-600 shadow-xl dark:shadow-charcoal-900/50">
        {/* Theme Toggle + Back to Home */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="border-2 border-greige/30 dark:border-charcoal-600 hover:border-rocky-blue/50 dark:hover:border-rocky-blue-500/50">
              <Home className="w-4 h-4" />
              العودة للصفحة الرئيسية
            </Button>
          </Link>
          <ThemeToggle />
        </div>
        
        {/* Header with architectural styling */}
        <div className="text-center mb-8 relative">
          <div className="absolute inset-0 border-2 border-rocky-blue/10 dark:border-rocky-blue/20 rounded-none opacity-50" />
          <h1 className="text-3xl font-black text-charcoal dark:text-cream relative z-10 mb-2">
            إنشاء حساب جديد
          </h1>
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-rocky-blue/40 to-transparent dark:via-rocky-blue-400/40 mx-auto mt-2" />
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            {...register('name')}
            type="text"
            label="الاسم الكامل"
            placeholder="أدخل اسمك الكامل"
            error={errors.name?.message}
          />

          <Input
            {...register('email')}
            type="email"
            label="البريد الإلكتروني"
            placeholder="example@email.com"
            error={errors.email?.message}
          />

          <Input
            {...register('phone')}
            type="tel"
            label="رقم الجوال"
            placeholder="05xxxxxxxx"
            error={errors.phone?.message}
          />

          <Input
            {...register('password')}
            type="password"
            label="كلمة المرور"
            placeholder="••••••••"
            error={errors.password?.message}
          />

          <Input
            {...register('confirmPassword')}
            type="password"
            label="تأكيد كلمة المرور"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
          />

          <Button
            type="submit"
            loading={loading}
            className="w-full"
          >
            إنشاء حساب
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t-2 border-greige/20 dark:border-charcoal-600">
          <p className="text-center text-sm text-blue-gray dark:text-greige">
            لديك حساب بالفعل؟{' '}
            <Link href="/login" className="text-rocky-blue dark:text-rocky-blue-300 hover:text-rocky-blue-600 dark:hover:text-rocky-blue-400 hover:underline font-semibold transition-colors duration-200">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
