'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { UserPlus, Mail, Phone, Lock, User } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Input } from '@/components/shared/Input'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

interface ApplicationInfo {
  id: string
  name: string
  email: string
  phone: string
  status: string
  isSubmitted?: boolean
}

export default function EngineerApplyPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useAuth()
  const token = params.token as string
  
  const [applicationInfo, setApplicationInfo] = useState<ApplicationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  // Storage key for this form
  const storageKey = `engineer_apply_${token}`

  // Load form data from localStorage on mount
  const loadSavedData = useCallback(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return parsed
        } catch {
          return null
        }
      }
    }
    return null
  }, [storageKey])

  const [formData, setFormData] = useState(() => {
    const saved = loadSavedData()
    return saved || {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    }
  })
  const [errors, setErrors] = useState<{ 
    name?: string
    email?: string
    phone?: string
    password?: string
    confirmPassword?: string
  }>({})

  // Save form data to localStorage whenever it changes (except passwords)
  useEffect(() => {
    if (token && typeof window !== 'undefined') {
      const dataToSave = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        // Don't save passwords for security
        password: '',
        confirmPassword: ''
      }
      localStorage.setItem(storageKey, JSON.stringify(dataToSave))
    }
  }, [formData.name, formData.email, formData.phone, token, storageKey])

  // Clear localStorage after successful submission
  const clearStoredData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  const fetchApplicationInfo = useCallback(async () => {
    try {
      setLoading(true)
      const result = await apiClient.get<{ success: boolean; application: ApplicationInfo }>(`/engineer/applications/${token}`)
      
      if (result.success && result.application) {
        if (result.application.status !== 'pending') {
          toast.error('هذا الطلب تمت مراجعته بالفعل')
          router.push('/')
          return
        }
        setApplicationInfo(result.application)
        // If already submitted, populate form with existing data
        if (result.application.isSubmitted && result.application.name) {
          setFormData({
            name: result.application.name,
            email: result.application.email,
            phone: result.application.phone,
            password: '',
            confirmPassword: ''
          })
        }
      } else {
        toast.error('رابط التسجيل غير صحيح أو منتهي الصلاحية')
        router.push('/')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل تحميل معلومات الطلب'
      toast.error(errorMessage)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }, [token, router])

  useEffect(() => {
    // Redirect if already logged in
    if (session?.user) {
      router.push('/engineer/dashboard')
      return
    }

    if (token) {
      fetchApplicationInfo()
    }
  }, [token, session, router, fetchApplicationInfo])

  const validateForm = () => {
    const newErrors: { 
      name?: string
      email?: string
      phone?: string
      password?: string
      confirmPassword?: string
    } = {}

    // Validate name - must be at least 2 characters, only letters and spaces
    const nameTrimmed = formData.name.trim()
    if (!nameTrimmed || nameTrimmed.length < 2) {
      newErrors.name = 'الاسم يجب أن يكون على الأقل حرفين'
    } else if (!/^[\u0600-\u06FF\sA-Za-z]+$/.test(nameTrimmed)) {
      newErrors.name = 'الاسم يجب أن يحتوي على أحرف فقط'
    }

    // Validate email - proper email format
    const emailTrimmed = formData.email.trim()
    if (!emailTrimmed) {
      newErrors.email = 'البريد الإلكتروني مطلوب'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح'
    } else if (emailTrimmed.length > 255) {
      newErrors.email = 'البريد الإلكتروني طويل جداً'
    }

    // Validate phone - Saudi phone number format (starts with 05 and has 10 digits)
    const phoneTrimmed = formData.phone.trim().replace(/\s/g, '')
    if (!phoneTrimmed) {
      newErrors.phone = 'رقم الجوال مطلوب'
    } else if (!/^05\d{8}$/.test(phoneTrimmed)) {
      newErrors.phone = 'رقم الجوال غير صحيح. يجب أن يبدأ بـ 05 ويحتوي على 10 أرقام'
    }

    // Validate password - at least 6 characters
    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة'
    } else if (formData.password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون على الأقل 6 أحرف'
    } else if (formData.password.length > 128) {
      newErrors.password = 'كلمة المرور طويلة جداً'
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'تأكيد كلمة المرور مطلوب'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمة المرور غير متطابقة'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setSubmitting(true)
      const result = await apiClient.post<{ success: boolean; message?: string }>(`/engineer/applications/${token}`, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password
      })

      if (result.success) {
        clearStoredData() // Clear localStorage after successful submission
        toast.success('تم تقديم طلب الانضمام بنجاح. سيتم مراجعته من قبل الإدارة')
        router.push('/login')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل تقديم الطلب'
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  if (!applicationInfo) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-cream to-greige/20 dark:from-charcoal-900 dark:via-charcoal-800 dark:to-charcoal-900">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-8 dark:bg-charcoal-800 dark:border-charcoal-600 shadow-xl dark:shadow-charcoal-900/50">
          <div className="text-center mb-8 relative">
            {/* Architectural frame decoration */}
            <div className="absolute inset-0 border-2 border-rocky-blue/10 dark:border-rocky-blue/20 rounded-none opacity-30" />
            
            <div className="w-20 h-20 bg-gradient-to-br from-rocky-blue/10 via-rocky-blue/5 to-greige/10 dark:from-rocky-blue/20 dark:via-rocky-blue/10 dark:to-charcoal-700/50 rounded-none flex items-center justify-center mx-auto mb-4 border-2 border-rocky-blue/40 dark:border-rocky-blue-500/60 shadow-lg relative">
              <UserPlus className="w-10 h-10 text-rocky-blue dark:text-rocky-blue-300 relative z-10" />
              {/* Corner decorations */}
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-rocky-blue/60 dark:border-rocky-blue-400" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-rocky-blue/60 dark:border-rocky-blue-400" />
            </div>
            <h1 className="text-3xl font-black text-charcoal dark:text-cream mb-2 relative z-10">
              طلب انضمام كمهندس
            </h1>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-rocky-blue/40 to-transparent dark:via-rocky-blue-400/40 mx-auto mt-2 mb-3" />
            <p className="text-blue-gray dark:text-greige relative z-10">
              تمت دعوتك للانضمام إلى منصة فكرة كمهندس معماري. يرجى ملء المعلومات التالية
            </p>
          </div>

          {/* Information Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-charcoal dark:text-cream flex items-center gap-2">
                <User className="w-4 h-4 text-rocky-blue dark:text-rocky-blue-300" />
                <span>الاسم الكامل *</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  // Only allow letters and spaces
                  const value = e.target.value.replace(/[^a-zA-Z\u0600-\u06FF\s]/g, '')
                  setFormData({ ...formData, name: value })
                  if (errors.name) {
                    setErrors({ ...errors, name: undefined })
                  }
                }}
                required
                minLength={2}
                maxLength={100}
                placeholder="أدخل اسمك الكامل"
                className={errors.name ? 'border-red-500 dark:border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-charcoal dark:text-cream flex items-center gap-2">
                <Mail className="w-4 h-4 text-rocky-blue dark:text-rocky-blue-300" />
                <span>البريد الإلكتروني *</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().trim()
                  setFormData({ ...formData, email: value })
                  if (errors.email) {
                    setErrors({ ...errors, email: undefined })
                  }
                }}
                required
                maxLength={255}
                placeholder="example@email.com"
                className={errors.email ? 'border-red-500 dark:border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-charcoal dark:text-cream flex items-center gap-2">
                <Phone className="w-4 h-4 text-rocky-blue dark:text-rocky-blue-300" />
                <span>رقم الجوال *</span>
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  // Only allow numbers, remove spaces
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setFormData({ ...formData, phone: value })
                  if (errors.phone) {
                    setErrors({ ...errors, phone: undefined })
                  }
                }}
                required
                minLength={10}
                maxLength={10}
                placeholder="05xxxxxxxx"
                pattern="05[0-9]{8}"
                className={errors.phone ? 'border-red-500 dark:border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-charcoal dark:text-cream flex items-center gap-2">
                <Lock className="w-4 h-4 text-rocky-blue dark:text-rocky-blue-300" />
                <span>كلمة المرور *</span>
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 128) // Max 128 characters
                  setFormData({ ...formData, password: value })
                  if (errors.password) {
                    setErrors({ ...errors, password: undefined })
                  }
                }}
                required
                minLength={6}
                maxLength={128}
                placeholder="••••••••"
                className={errors.password ? 'border-red-500 dark:border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-charcoal dark:text-cream flex items-center gap-2">
                <Lock className="w-4 h-4 text-rocky-blue dark:text-rocky-blue-300" />
                <span>تأكيد كلمة المرور *</span>
              </label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 128) // Max 128 characters
                  setFormData({ ...formData, confirmPassword: value })
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: undefined })
                  }
                }}
                required
                minLength={6}
                maxLength={128}
                placeholder="••••••••"
                className={errors.confirmPassword ? 'border-red-500 dark:border-red-500' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? 'جاري الإرسال...' : 'تقديم طلب الانضمام'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-greige/20 dark:border-charcoal-600">
            <div className="p-4 bg-gradient-to-br from-yellow-50/50 via-yellow-50/30 to-transparent dark:from-yellow-900/20 dark:via-yellow-900/10 dark:to-transparent border-2 border-yellow-200/50 dark:border-yellow-800/50 rounded-none">
              <p className="text-sm text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
                <strong className="text-yellow-900 dark:text-yellow-200">ملاحظة:</strong>
                <span>بعد تقديم الطلب، سيتم مراجعته من قبل الإدارة. سيتم إشعارك عند الموافقة على طلبك.</span>
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
