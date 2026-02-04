'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfileDisplayName } from '@/components/providers/ProfileDisplayNameProvider'
import { useRouter } from 'next/navigation'
import { User, Mail, Phone, Lock, Save } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Input } from '@/components/shared/Input'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import { formatDateHijriMiladi } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const profileSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب').transform((s) => s.trim()).pipe(z.string().min(2, 'الاسم يجب أن يكون على الأقل حرفين')),
  email: z.string().min(1, 'البريد الإلكتروني مطلوب').transform((s) => s.trim()).pipe(z.string().email('البريد الإلكتروني غير صحيح')),
  phone: z.string().min(1, 'رقم الجوال مطلوب').transform((s) => s.trim()).pipe(z.string().min(10, 'رقم الجوال يجب أن يكون على الأقل 10 أرقام').max(15, 'رقم الجوال طويل جداً')),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional().refine((v) => !v || v.length === 0 || v.length >= 6, 'كلمة المرور الجديدة يجب أن تكون على الأقل 6 أحرف'),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  const newPass = (data.newPassword ?? '').trim()
  if (newPass.length === 0) return true
  if (!(data.currentPassword ?? '').trim()) return false
  if (newPass !== (data.confirmPassword ?? '').trim()) return false
  return true
}, {
  message: 'كلمة المرور الجديدة وتأكيدها غير متطابقين',
  path: ['confirmPassword'],
}).refine((data) => {
  const current = (data.currentPassword ?? '').trim()
  const newPass = (data.newPassword ?? '').trim()
  if (newPass.length === 0) return true
  return current !== newPass
}, {
  message: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية',
  path: ['newPassword'],
})

type ProfileFormData = z.infer<typeof profileSchema>

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  role: string
  createdAt: string
  updatedAt: string
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useAuth()
  const { setDisplayName } = useProfileDisplayName()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const [showCurrentPasswordForError, setShowCurrentPasswordForError] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
    setFocus,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const onValidationError = useCallback((errors: Record<string, { message?: string }>) => {
    const messages = Object.entries(errors)
      .filter(([, e]) => e?.message)
      .map(([, e]) => e!.message)
    const firstKey = Object.keys(errors)[0]
    if (firstKey) setFocus(firstKey as keyof ProfileFormData)
    toast.error(messages.length && messages[0] ? messages[0] : 'يرجى تصحيح البيانات في الحقول المعلمة')
  }, [setFocus])

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    try {
      setLoadingProfile(true)
      const result = await apiClient.get<{ success: boolean; user: UserProfile }>('/users/profile')
      
      if (result.success && result.user) {
        setProfile(result.user)
        setDisplayName(result.user.name)
        reset({
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل تحميل البيانات'
      toast.error(errorMessage)
    } finally {
      setLoadingProfile(false)
    }
  }, [reset, setDisplayName])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session?.user) {
      fetchProfile()
    }
  }, [status, session, router, fetchProfile])

  const onSubmit = async (data: ProfileFormData) => {
    const emailOrPhoneChanged =
      (profile && (data.email?.trim() !== profile.email?.trim() || data.phone?.trim() !== profile.phone?.trim()))
    if (emailOrPhoneChanged && (!data.currentPassword || !String(data.currentPassword).trim())) {
      toast.error('تغيير البريد أو رقم الجوال يتطلب إدخال كلمة المرور الحالية للتأكيد')
      return
    }
    const updateData: {
      name?: string
      email?: string
      phone?: string
      currentPassword?: string
      newPassword?: string
    } = {
      name: data.name,
      email: data.email,
      phone: data.phone,
    }
    if (emailOrPhoneChanged && data.currentPassword) {
      updateData.currentPassword = data.currentPassword
    }
    if (data.newPassword && data.currentPassword) {
      updateData.currentPassword = updateData.currentPassword ?? data.currentPassword
      updateData.newPassword = data.newPassword
    }

    const loadingToast = toast.loading('جاري الحفظ...')
    try {
      const result = await apiClient.put<{ success: boolean; message?: string; error?: string; user: UserProfile }>(
        '/users/profile',
        updateData
      )
      toast.dismiss(loadingToast)

      if (result?.success && result.user) {
        setProfile((prev) => (prev ? { ...prev, ...result.user } : result.user))
        setShowPasswordFields(false)
        setShowCurrentPasswordForError(false)
        setDisplayName(result.user.name)
        if (session?.user) {
          await updateSession({
            ...session,
            user: {
              id: session.user.id,
              name: result.user.name,
              email: result.user.email,
              role: session.user.role,
            },
          })
        }
        reset({
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
        await fetchProfile()
        toast.success('تم حفظ التغييرات بنجاح')
      } else {
        const errMsg = result?.error || result?.message || 'لم يتم تحديث البيانات'
        toast.error(errMsg)
        if (typeof errMsg === 'string' && errMsg.includes('كلمة المرور الحالية')) {
          setShowCurrentPasswordForError(true)
        }
      }
    } catch (err) {
      toast.dismiss(loadingToast)
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ'
      toast.error(msg)
      if (typeof msg === 'string' && msg.includes('كلمة المرور الحالية')) {
        setShowCurrentPasswordForError(true)
      }
    }
  }

  if (status === 'loading' || loadingProfile) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Loading text="جاري التحميل..." />
        </div>
      </div>
    )
  }

  if (!session || !profile) {
    return null
  }

  const dashboardHref =
    session.user.role === 'ENGINEER'
      ? '/engineer/dashboard'
      : session.user.role === 'ADMIN'
        ? '/admin/dashboard'
        : '/dashboard'

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BackButton href={dashboardHref} label="العودة إلى لوحة التحكم" />
        
        <div className="max-w-2xl mx-auto mt-8">
          <Card className="p-6 dark:bg-charcoal-800 dark:border-charcoal-600">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-rocky-blue/10 dark:bg-rocky-blue/20 flex items-center justify-center border-2 border-rocky-blue/30">
                <User className="w-6 h-6 text-rocky-blue dark:text-rocky-blue-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-charcoal dark:text-cream">معلومات الحساب</h1>
                <p className="text-sm text-blue-gray dark:text-greige">إدارة معلومات حسابك الشخصي</p>
              </div>
            </div>

            <form
              id="profile-form"
              onSubmit={handleSubmit(onSubmit, onValidationError)}
              className="space-y-6"
            >
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    الاسم الكامل
                  </div>
                </label>
                <Input
                  id="name"
                  type="text"
                  {...register('name')}
                  error={errors.name?.message}
                  className="w-full"
                  placeholder="أدخل اسمك الكامل"
                />
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    البريد الإلكتروني
                  </div>
                </label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  error={errors.email?.message}
                  className="w-full"
                  placeholder="example@email.com"
                />
                <p className="mt-1 text-xs text-blue-gray dark:text-greige">
                  البريد والجوال هما المعرّفان لحسابك. تغيير أحدهما يتطلب إدخال كلمة المرور الحالية للتأكيد.
                </p>
              </div>

              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    رقم الجوال
                  </div>
                </label>
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  error={errors.phone?.message}
                  className="w-full"
                  placeholder="05xxxxxxxx"
                />
              </div>

              {/* Password Change Section */}
              <div className="border-t border-greige/30 dark:border-charcoal-600 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-charcoal dark:text-cream">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      كلمة المرور
                    </div>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordFields(!showPasswordFields)}
                  >
                    {showPasswordFields ? 'إلغاء التغيير' : 'تغيير كلمة المرور'}
                  </Button>
                </div>

                {(showPasswordFields || showCurrentPasswordForError || (profile && (watch('email')?.trim() !== profile.email?.trim() || watch('phone')?.trim() !== profile.phone?.trim()))) && (
                  <div className="space-y-4 bg-greige/10 dark:bg-charcoal-700/50 p-4 rounded-lg">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                        كلمة المرور الحالية
                        {(showCurrentPasswordForError || (profile && (watch('email')?.trim() !== profile.email?.trim() || watch('phone')?.trim() !== profile.phone?.trim()) && !showPasswordFields)) && (
                          <span className="text-rocky-blue dark:text-rocky-blue-300 mr-1"> (مطلوبة لتأكيد تغيير البريد أو الجوال)</span>
                        )}
                      </label>
                      <Input
                        id="currentPassword"
                        type="password"
                        {...register('currentPassword')}
                        error={errors.currentPassword?.message}
                        className="w-full"
                        placeholder="أدخل كلمة المرور الحالية"
                      />
                    </div>

                    {showPasswordFields && (
                      <>
                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                            كلمة المرور الجديدة
                          </label>
                          <Input
                            id="newPassword"
                            type="password"
                            {...register('newPassword')}
                            error={errors.newPassword?.message}
                            className="w-full"
                            placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                          />
                        </div>

                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                            تأكيد كلمة المرور
                          </label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            {...register('confirmPassword')}
                            error={errors.confirmPassword?.message}
                            className="w-full"
                            placeholder="أعد إدخال كلمة المرور الجديدة"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Account Info */}
              <div className="border-t border-greige/30 dark:border-charcoal-600 pt-6">
                <h3 className="text-sm font-medium text-charcoal dark:text-cream mb-3">معلومات الحساب</h3>
                <div className="space-y-2 text-sm text-blue-gray dark:text-greige">
                  <div className="flex justify-between">
                    <span>تاريخ التسجيل:</span>
                    <span>{formatDateHijriMiladi(profile.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>آخر تحديث:</span>
                    <span>{formatDateHijriMiladi(profile.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>نوع الحساب:</span>
                    <span className="px-2 py-1 bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300 rounded-full text-xs border border-rocky-blue/30">
                      {profile.role === 'CLIENT' ? 'عميل' : profile.role === 'ENGINEER' ? 'مهندس' : 'مدير'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(onSubmit, onValidationError)()}
                  className="flex-1 font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-rocky-blue dark:bg-rocky-blue-500 text-cream hover:bg-rocky-blue-600 dark:hover:bg-rocky-blue-400 px-4 py-2 text-base"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">جاري الحفظ...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      حفظ التغييرات
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (profile) {
                      reset({
                        name: profile.name,
                        email: profile.email,
                        phone: profile.phone,
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      })
                    }
                    setShowPasswordFields(false)
                  }}
                  disabled={isSubmitting}
                  className="font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-2 border-rocky-blue dark:border-rocky-blue-400 text-rocky-blue dark:text-rocky-blue-300 hover:bg-rocky-blue hover:text-cream dark:hover:bg-rocky-blue-600 px-4 py-2 text-base"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </div>
  )
}
