'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/schemas/userSchema'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Card } from '@/components/shared/Card'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Home } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { getSession } from 'next-auth/react'

function getDashboardPathByRole(role: string | undefined): string {
  if (role === 'ADMIN') return '/admin/dashboard'
  if (role === 'ENGINEER') return '/engineer/dashboard'
  return '/dashboard'
}

export default function LoginPage() {
  const { data: session, signIn } = useAuth()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema)
  })

  useEffect(() => {
    if (session?.user) {
      window.location.href = getDashboardPathByRole(session.user.role)
    }
  }, [session])

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)
    try {
      const result = await signIn(data.email, data.password)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      if (result?.ok) {
        toast.success('تم تسجيل الدخول بنجاح')
        let role: string | undefined = result.user?.role as string | undefined
        if (role === undefined) {
          await new Promise((r) => setTimeout(r, 200))
          const s = await getSession()
          role = (s?.user as { role?: string })?.role
        }
        const path = getDashboardPathByRole(role)
        await new Promise((r) => setTimeout(r, 150))
        window.location.href = path
        return
      }
    } catch {
      toast.error('حدث خطأ ما')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-xs sm:max-w-md dark:bg-charcoal-800 dark:border-charcoal-600">
        {/* Theme Toggle + Back to Home */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 mb-6">
          <Link href="/" className="flex-1 sm:flex-none">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">العودة للصفحة الرئيسية</span>
              <span className="sm:hidden">الرئيسية</span>
            </Button>
          </Link>
          <ThemeToggle />
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-charcoal dark:text-cream">تسجيل الدخول</h1>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <Input
            {...register('email')}
            type="email"
            label="البريد الإلكتروني"
            placeholder="example@email.com"
            error={errors.email?.message}
          />

          <Input
            {...register('password')}
            type="password"
            label="كلمة المرور"
            placeholder="••••••••"
            error={errors.password?.message}
          />

          <p className="text-center -mt-2 flex flex-col gap-1 text-xs sm:text-sm">
            <Link href="/forgot-password" className="text-rocky-blue dark:text-rocky-blue-300 hover:underline">
              نسيت كلمة المرور؟
            </Link>
            <Link href="/forgot-email" className="text-rocky-blue dark:text-rocky-blue-300 hover:underline">
              نسيت البريد الإلكتروني؟
            </Link>
          </p>

          <Button
            type="submit"
            loading={loading}
            className="w-full"
          >
            تسجيل الدخول
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-blue-gray dark:text-greige">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="text-rocky-blue dark:text-rocky-blue-300 hover:underline font-semibold">
            إنشاء حساب جديد
          </Link>
        </p>
      </Card>
    </div>
  )
}
