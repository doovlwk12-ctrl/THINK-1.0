'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Building2,
  ClipboardList,
  PackagePlus,
  Package,
  CheckCircle2,
  Home,
  Store,
  Landmark,
  Palmtree,
  Heart,
} from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { apiClient } from '@/lib/api'
import { storage } from '@/lib/localStorage'
import { regions, getCitiesForRegion, getDistrictsForCity, otherOption, citiesByRegion } from '@/lib/locations'
import { BackButton } from '@/components/shared/BackButton'
import toast from 'react-hot-toast'

interface Package {
  id: string
  nameAr: string
  price: number
  revisions: number
  executionDays: number
}

interface Addon {
  id: string
  nameAr: string
  descriptionAr?: string
  priceHalala: number
}

// الخطوات حسب التقرير الشامل — أيقونات Lucide أوضح لكل خطوة
const formSteps = [
  { number: 1, title: 'معلومات أساسية', icon: FileText, id: 'basic-info' },
  { number: 2, title: 'نوع الاستخدام', icon: Building2, id: 'project-type' },
  { number: 3, title: 'الأسئلة التفصيلية', icon: ClipboardList, id: 'project-details' },
  { number: 4, title: 'الإضافات', icon: PackagePlus, id: 'addons' },
  { number: 5, title: 'المراجعة', icon: CheckCircle2, id: 'review' },
]

// أنواع المشاريع — أيقونات Lucide أوضح
const projectCategories = [
  { value: 'residential', label: 'سكني', icon: Home, description: 'فيلا، شقة، دوبلكس، شاليه' },
  { value: 'commercial', label: 'تجاري', icon: Store, description: 'مكاتب، محلات، مطاعم، مقاهي، عيادات' },
  { value: 'service', label: 'خدمي', icon: Landmark, description: 'مدارس، مساجد، مراكز صحية، مكاتب حكومية' },
  { value: 'touristic', label: 'سياحي', icon: Palmtree, description: 'فندق، منتجعات، شاليهات، فلل تأجير' },
]

export function CreateOrderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useAuth()
  const selectedPackageId = searchParams.get('package')
  
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [, setAddons] = useState<Addon[]>([])
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [formData, setFormData] = useState<Record<string, unknown>>({
    // Step 1: المعلومات الأساسية
    region: '',
    city: '',
    district: '',
    districtOther: '',
    projectType: '', // new or renovation
    landArea: '',
    landLength: '',
    landWidth: '',
    landDepth: '',
    landAreaOverride: false,
    dimensionsConfirmed: false,
    facadeCount: '',
    facadeDirection: '',
    floorsCount: '',
    // Step 2: نوع المشروع
    projectCategory: '',
    // Step 3: أسئلة سكني
    res_lifestyle_familyTime: '',
    res_lifestyle_openSpaces: '',
    res_livingRoom: '',
    res_dailyActivities: [],
    res_privacy_level: '',
    res_gender_separation: '',
    res_privacy_features: [],
    res_windows: '',
    res_family_size: '',
    res_family_growth: '',
    res_family_ages: [],
    res_elderly_room: '',
    res_nanny_driver_room: '',
    res_multiuse_room: '',
    res_cooking_style: '',
    res_kitchen_type: '',
    res_laundry: '',
    res_storage: '',
    res_style: '',
    res_ceiling_height: '',
    res_natural_light: '',
    res_land_shape: '',
    res_annoying: '',
    res_favorite: '',
    res_regrets: '',
    res_feelings: [],
    res_free_text: '',
    // Step 3: أسئلة تجاري
    com_special_spaces: [],
    com_staff_count: '',
    com_parking_needed: '',
    com_parking_count: '',
    com_activity_level: '',
    com_priority: [],
    com_free_text: '',
    // Step 3: أسئلة خدمي
    srv_target_group: [],
    srv_daily_users: '',
    srv_usage_pattern: '',
    srv_movement_level: '',
    srv_privacy_level: '',
    srv_required_spaces: [],
    srv_special_entries: [],
    srv_parking_count: '',
    srv_special_requirements: [],
    srv_notes: '',
    // Step 3: أسئلة سياحي
    tour_units_count: '',
    tour_site_type: '',
    tour_target_group: [],
    tour_privacy_level: '',
    tour_required_spaces: [],
    tour_first_impression: '',
    tour_planning_preference: '',
    tour_notes: '',
    // Step 4: الإضافات
    selectedAddons: [],
    addonsNotes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load saved form data from localStorage
  useEffect(() => {
    const savedData = storage.get<Record<string, unknown>>('order_form_data')
    const savedStep = storage.get<number>('order_form_step', 0)
    const savedPackageId = storage.get<string>('order_selected_package')
    const savedAddons = storage.get<string[]>('order_selected_addons', [])
    
    if (savedData) {
      const normalizedData = { ...savedData }
      if (!normalizedData.city && typeof normalizedData.location === 'string') {
        normalizedData.city = normalizedData.location
      }
      if (!normalizedData.region && typeof normalizedData.city === 'string') {
        const foundRegion = Object.entries(citiesByRegion).find(([, cities]) =>
          cities.includes(normalizedData.city as string)
        )
        if (foundRegion) {
          normalizedData.region = foundRegion[0]
        }
      }
      setFormData(normalizedData)
    }
    if (savedStep !== null) {
      setCurrentStep(savedStep)
    }
    if (savedPackageId && packages.length > 0) {
      const pkg = packages.find(p => p.id === savedPackageId)
      if (pkg) setSelectedPackage(pkg)
    }
    if (savedAddons && savedAddons.length > 0) {
      setSelectedAddons(savedAddons)
    }
  }, [packages])

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      storage.set('order_form_data', formData)
    }
  }, [formData])

  // Save current step to localStorage
  useEffect(() => {
    storage.set('order_form_step', currentStep)
  }, [currentStep])

  // Save selected package to localStorage
  useEffect(() => {
    if (selectedPackage) {
      storage.set('order_selected_package', selectedPackage.id)
    }
  }, [selectedPackage])

  // Save selected addons to localStorage
  useEffect(() => {
    storage.set('order_selected_addons', selectedAddons)
  }, [selectedAddons])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.city) {
        storage.set('order_form_data', formData)
        storage.set('order_form_step', currentStep)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [formData, currentStep])

  // Warn before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formData.city) {
        e.preventDefault()
        e.returnValue = 'لديك بيانات غير محفوظة. هل تريد المغادرة؟'
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [formData])

  const fetchPackages = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; packages: Package[] }>('/packages')
      if (result.success && result.packages) {
        setPackages(result.packages)
        if (selectedPackageId && result.packages.length > 0) {
          const pkg = result.packages.find((p: Package) => p.id === selectedPackageId)
          if (pkg) setSelectedPackage(pkg)
        } else if (!selectedPackageId && result.packages.length > 0) {
          setSelectedPackage(result.packages[0])
        }
      }
    } catch {
      toast.error('فشل تحميل الباقات')
    }
  }, [selectedPackageId])

  const fetchAddons = useCallback(async () => {
    try {
      // TODO: Replace with actual API endpoint when available
      // const res = await fetch('/api/addons')
      // const data = await res.json()
      // if (data.success) {
      //   setAddons(data.addons)
      // }
      setAddons([]) // Placeholder
    } catch {
      // Silent fail for addons
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchPackages()
      fetchAddons()
    }
  }, [status, router, fetchPackages, fetchAddons])

  useEffect(() => {
    if (selectedPackageId && packages.length > 0) {
      const pkg = packages.find(p => p.id === selectedPackageId)
      if (pkg) {
        setSelectedPackage(pkg)
        storage.set('order_selected_package', pkg.id)
      }
    } else if (!selectedPackageId) {
      const savedPackageId = storage.get<string>('order_selected_package')
      if (!savedPackageId && packages.length > 0) {
        router.push('/orders/select-package')
      }
    }
  }, [selectedPackageId, packages, router])

  const getIntegerString = (value: unknown): string | null => {
    const text = String(value ?? '').trim()
    if (!text || !/^\d+$/.test(text)) return null
    return text
  }

  const formatSuggestionNumber = (value: number): string => {
    if (!Number.isFinite(value)) return '-'
    const rounded = Math.round(value * 100) / 100
    if (Number.isInteger(rounded)) return String(rounded)
    return rounded.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
  }

  const handleInputChange = (id: string, value: unknown) => {
    const newData = { ...formData, [id]: value }
    if (id === 'region') {
      newData.city = ''
      newData.district = ''
      newData.districtOther = ''
    }
    if (id === 'city') {
      newData.district = ''
      newData.districtOther = ''
    }
    if (id === 'landLength' || id === 'landWidth' || id === 'landArea') {
      newData.landAreaOverride = false
      newData.dimensionsConfirmed = false
    }
    if (id === 'landLength' || id === 'landWidth') {
      const nextLength = id === 'landLength' ? value : formData.landLength
      const nextWidth = id === 'landWidth' ? value : formData.landWidth
      const lengthText = getIntegerString(nextLength)
      const widthText = getIntegerString(nextWidth)
      if (lengthText && widthText) {
        const prevLengthText = getIntegerString(formData.landLength)
        const prevWidthText = getIntegerString(formData.landWidth)
        const prevCalc =
          prevLengthText && prevWidthText
            ? String(Number(prevLengthText) * Number(prevWidthText))
            : ''
        const currentAreaText = String(formData.landArea ?? '').trim()
        if (!currentAreaText || currentAreaText === prevCalc) {
          newData.landArea = String(Number(lengthText) * Number(widthText))
        }
      }
    }
    if (id === 'landAreaOverride') {
      newData.dimensionsConfirmed = false
    }
    if (id === 'district' && value !== otherOption) {
      newData.districtOther = ''
    }
    setFormData(newData)
    storage.set('order_form_data', newData)
    // Clear error for this field when user starts typing
    if (errors[id]) {
      const newErrors = { ...errors }
      delete newErrors[id]
      setErrors(newErrors)
    }
  }

  const handleConfirmDimensions = () => {
    const s = (v: unknown) => String(v ?? '').trim()
    const areaText = s(formData.landArea)
    const lengthText = s(formData.landLength)
    const widthText = s(formData.landWidth)
    if (!areaText || !lengthText || !widthText) {
      toast.error('أدخل مساحة الأرض والطول والعرض أولاً')
      return
    }
    if (!/^\d+$/.test(areaText) || !/^\d+$/.test(lengthText) || !/^\d+$/.test(widthText)) {
      toast.error('المساحة والطول والعرض يجب أن تكون أرقاماً صحيحة')
      return
    }
    const expectedArea = Number(lengthText) * Number(widthText)
    const areaNum = Number(areaText)
    if (areaNum === expectedArea) {
      setFormData((prev) => ({ ...prev, dimensionsConfirmed: true }))
      const newErrors = { ...errors }
      delete newErrors.landArea
      setErrors(newErrors)
      storage.set('order_form_data', { ...formData, dimensionsConfirmed: true })
      toast.success('تم تأكيد الأبعاد — المساحة والطول والعرض متطابقة')
    } else {
      setErrors((prev) => ({
        ...prev,
        landArea: `المساحة المدخلة لا تطابق الطول × العرض. الصحيح ${expectedArea} م²`
      }))
      toast.error(`المساحة لا تطابق الطول × العرض. الصحيح: ${expectedArea} م²`)
    }
  }

  // Validate Step 1: Basic Info
  const validateStep1 = (): boolean => {
    const stepErrors: Record<string, string> = {}
    const s = (v: unknown) => String(v ?? '').trim()

    if (!formData.region) stepErrors.region = 'المنطقة مطلوبة'
    if (!formData.city) stepErrors.city = 'المدينة مطلوبة'
    if (!formData.district) stepErrors.district = 'الحي مطلوب'
    if (formData.district === otherOption && (!formData.districtOther || s(formData.districtOther) === '')) {
      stepErrors.districtOther = 'يرجى كتابة الحي'
    }
    if (!formData.projectType) stepErrors.projectType = 'نوع المشروع مطلوب'
    if (!s(formData.landArea)) {
      stepErrors.landArea = 'مساحة الأرض مطلوبة'
    } else if (!/^\d+$/.test(s(formData.landArea))) {
      stepErrors.landArea = 'يجب أن يكون رقماً صحيحاً'
    }
    if (!s(formData.landLength)) {
      stepErrors.landLength = 'الطول مطلوب'
    } else if (!/^\d+$/.test(s(formData.landLength))) {
      stepErrors.landLength = 'يجب أن يكون رقماً صحيحاً'
    }
    if (!s(formData.landWidth)) {
      stepErrors.landWidth = 'العرض مطلوب'
    } else if (!/^\d+$/.test(s(formData.landWidth))) {
      stepErrors.landWidth = 'يجب أن يكون رقماً صحيحاً'
    }
    if (!stepErrors.landArea && !formData.landAreaOverride) {
      const landAreaVal = s(formData.landArea)
      const landLengthVal = s(formData.landLength)
      const landWidthVal = s(formData.landWidth)
      if (/^\d+$/.test(landAreaVal) && /^\d+$/.test(landLengthVal) && /^\d+$/.test(landWidthVal)) {
        const expectedArea = Number(landLengthVal) * Number(landWidthVal)
        if (Number(landAreaVal) !== expectedArea) {
          stepErrors.landArea = `المساحة المدخلة لا تطابق الطول × العرض. الصحيح ${expectedArea} م²`
        }
      }
    }
    const landDepthVal = s(formData.landDepth)
    if (landDepthVal && !/^\d+$/.test(landDepthVal)) {
      stepErrors.landDepth = 'يجب أن يكون رقماً صحيحاً'
    }
    if (!formData.facadeCount) stepErrors.facadeCount = 'عدد الواجهات مطلوب'
    else if (!/^\d+$/.test(s(formData.facadeCount))) stepErrors.facadeCount = 'يجب أن يكون رقماً صحيحاً'
    if (!s(formData.facadeDirection)) {
      stepErrors.facadeDirection = 'اتجاه الواجهات مطلوب'
    }
    if (!s(formData.floorsCount)) {
      stepErrors.floorsCount = 'عدد الطوابق مطلوب'
    } else if (!/^\d+$/.test(s(formData.floorsCount))) {
      stepErrors.floorsCount = 'يجب أن يكون رقماً صحيحاً'
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  // Validate Step 2: Project Type
  const validateStep2 = (): boolean => {
    const stepErrors: Record<string, string> = {}
    
    if (!formData.projectCategory) {
      stepErrors.projectCategory = 'نوع المشروع مطلوب'
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  const validateStep3 = (): boolean => {
    const stepErrors: Record<string, string> = {}
    const category = typeof formData.projectCategory === 'string' ? formData.projectCategory : ''

    const requireString = (field: string, message = 'هذا الحقل مطلوب') => {
      const value = formData[field]
      if (!value || String(value).trim() === '') {
        stepErrors[field] = message
      }
    }

    const requireArray = (field: string, message = 'اختر على الأقل خياراً') => {
      const value = formData[field]
      if (!Array.isArray(value) || value.length === 0) {
        stepErrors[field] = message
      }
    }

    const requireNumber = (field: string) => {
      const value = formData[field]
      const t = String(value ?? '').trim()
      if (!t) {
        stepErrors[field] = 'هذا الحقل مطلوب'
      } else if (!/^\d+$/.test(t)) {
        stepErrors[field] = 'يجب أن يكون رقماً صحيحاً'
      }
    }

    if (category === 'residential') {
      requireString('res_lifestyle_familyTime')
      requireString('res_lifestyle_openSpaces')
      requireString('res_livingRoom')
      requireArray('res_dailyActivities')
      requireString('res_privacy_level')
      requireString('res_gender_separation')
      requireArray('res_privacy_features')
      requireString('res_windows')
      requireNumber('res_family_size')
      requireString('res_family_growth')
      requireArray('res_family_ages')
      requireString('res_elderly_room')
      requireString('res_nanny_driver_room')
      requireString('res_multiuse_room')
      requireString('res_cooking_style')
      requireString('res_kitchen_type')
      requireString('res_laundry')
      requireString('res_storage')
      requireString('res_style')
      requireString('res_ceiling_height')
      requireString('res_natural_light')
      requireString('res_land_shape')
      requireString('res_annoying')
      requireString('res_favorite')
      requireString('res_regrets')
      requireArray('res_feelings')
      requireString('res_free_text')
    } else if (category === 'commercial') {
      requireArray('com_special_spaces')
      requireString('com_staff_count')
      requireString('com_parking_needed')
      if (formData.com_parking_needed === 'نعم') {
        requireNumber('com_parking_count')
      }
      requireString('com_activity_level')
      requireArray('com_priority')
      requireString('com_free_text')
    } else if (category === 'service') {
      requireArray('srv_target_group')
      requireNumber('srv_daily_users')
      requireString('srv_usage_pattern')
      requireString('srv_movement_level')
      requireString('srv_privacy_level')
      requireArray('srv_required_spaces')
      requireArray('srv_special_entries')
      requireNumber('srv_parking_count')
      requireArray('srv_special_requirements')
      requireString('srv_notes')
    } else if (category === 'touristic') {
      requireString('tour_units_count')
      requireString('tour_site_type')
      requireArray('tour_target_group')
      requireString('tour_privacy_level')
      requireArray('tour_required_spaces')
      requireString('tour_first_impression')
      requireString('tour_planning_preference')
      requireString('tour_notes')
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  // Validate current step
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0:
        return validateStep1()
      case 1:
        return validateStep2()
      case 2:
        return validateStep3()
      case 3:
        return true // Optional addons
      case 4:
        return true // Review step
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!validateCurrentStep()) {
      toast.error('يرجى إدخال جميع البيانات المطلوبة بشكل صحيح')
      return
    }

    if (currentStep < formSteps.length - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      storage.set('order_form_step', nextStep)
      setErrors({})
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1
      setCurrentStep(prevStep)
      storage.set('order_form_step', prevStep)
      setErrors({})
    }
  }

  type Question = {
    id: string
    label: string
    type: 'radio' | 'checkbox' | 'text' | 'number' | 'textarea'
    options?: string[]
    placeholder?: string
    rows?: number
    columns?: number
    showWhen?: (data: Record<string, unknown>) => boolean
  }

  type QuestionSection = {
    title: string
    questions: Question[]
  }

  const getStringValue = (value: unknown): string =>
    typeof value === 'string' ? value : value != null ? String(value) : ''
  const getArrayValue = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((x) => String(x)) : []

  const toggleArrayValue = (fieldId: string, option: string) => {
    const current = getArrayValue(formData[fieldId])
    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option]
    handleInputChange(fieldId, next)
  }

  const renderQuestion = (question: Question) => {
    if (question.showWhen && !question.showWhen(formData)) return null
    const errorMessage = errors[question.id]
    const gridClass = question.columns === 3
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-3'
    const requiredBadge = (
      <span className="inline-block text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full mr-1">مطلوب</span>
    )

    if (question.type === 'radio' && question.options) {
      const value = getStringValue(formData[question.id])
      return (
        <div key={question.id} className="space-y-3">
          <p className="text-sm font-medium text-charcoal dark:text-cream flex items-center gap-2 flex-wrap">
            {requiredBadge}
            {question.label}
          </p>
          <div className={gridClass}>
            {question.options.map((option) => {
              const isSelected = value === option
              return (
                <label
                  key={option}
                  className={`relative flex items-center justify-center gap-2 min-h-[52px] px-4 py-3 border-2 rounded-xl cursor-pointer transition-all duration-200 text-sm font-medium ${
                    isSelected
                      ? 'border-rocky-blue dark:border-rocky-blue-600 bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-200 shadow-sm'
                      : 'border-greige/30 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream hover:border-rocky-blue/40 dark:hover:border-rocky-blue-500/40 hover:bg-greige/5 dark:hover:bg-charcoal-600/50'
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={isSelected}
                    onChange={(e) => handleInputChange(question.id, e.target.value)}
                    className="sr-only"
                  />
                  {isSelected && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-rocky-blue dark:text-rocky-blue-300" />}
                  <span>{option}</span>
                </label>
              )
            })}
          </div>
          {errorMessage && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
        </div>
      )
    }

    if (question.type === 'checkbox' && question.options) {
      const values = getArrayValue(formData[question.id])
      return (
        <div key={question.id} className="space-y-3">
          <p className="text-sm font-medium text-charcoal dark:text-cream flex items-center gap-2 flex-wrap">
            {requiredBadge}
            {question.label}
            {values.length > 0 && (
              <span className="text-xs text-rocky-blue dark:text-rocky-blue-300 font-medium">(تم اختيار {values.length})</span>
            )}
          </p>
          <div className={gridClass}>
            {question.options.map((option) => {
              const isSelected = values.includes(option)
              return (
                <label
                  key={option}
                  className={`relative flex items-center justify-center gap-2 min-h-[52px] px-4 py-3 border-2 rounded-xl cursor-pointer transition-all duration-200 text-sm font-medium ${
                    isSelected
                      ? 'border-rocky-blue dark:border-rocky-blue-600 bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-200 shadow-sm'
                      : 'border-greige/30 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream hover:border-rocky-blue/40 dark:hover:border-rocky-blue-500/40 hover:bg-greige/5 dark:hover:bg-charcoal-600/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleArrayValue(question.id, option)}
                    className="sr-only"
                  />
                  {isSelected && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-rocky-blue dark:text-rocky-blue-300" />}
                  <span>{option}</span>
                </label>
              )
            })}
          </div>
          {errorMessage && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
        </div>
      )
    }

    if (question.type === 'textarea') {
      return (
        <div key={question.id} className="space-y-2">
          <label className="block text-sm font-medium text-charcoal dark:text-cream flex items-center gap-2 flex-wrap">
            {requiredBadge}
            {question.label}
          </label>
          <textarea
            value={getStringValue(formData[question.id])}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            rows={question.rows ?? 4}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-rocky-blue focus:border-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream placeholder:text-blue-gray dark:placeholder:text-greige ${
              errorMessage ? 'border-red-500 dark:border-red-500' : 'border-greige/30 dark:border-charcoal-600'
            }`}
            placeholder={question.placeholder}
          />
          {errorMessage && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
        </div>
      )
    }

    if (question.type === 'number') {
      return (
        <div key={question.id} className="space-y-2">
          <label className="block text-sm font-medium text-charcoal dark:text-cream flex items-center gap-2 flex-wrap">
            {requiredBadge}
            {question.label}
          </label>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={getStringValue(formData[question.id])}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-rocky-blue focus:border-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream ${
              errorMessage ? 'border-red-500 dark:border-red-500' : 'border-greige/30 dark:border-charcoal-600'
            }`}
            placeholder={question.placeholder}
          />
          {errorMessage && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
        </div>
      )
    }

    return (
      <div key={question.id} className="space-y-2">
        <label className="block text-sm font-medium text-charcoal dark:text-cream flex items-center gap-2 flex-wrap">
          {requiredBadge}
          {question.label}
        </label>
        <input
          type="text"
          value={getStringValue(formData[question.id])}
          onChange={(e) => handleInputChange(question.id, e.target.value)}
          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-rocky-blue focus:border-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream ${
            errorMessage ? 'border-red-500 dark:border-red-500' : 'border-greige/30 dark:border-charcoal-600'
          }`}
          placeholder={question.placeholder}
        />
        {errorMessage && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
      </div>
    )
  }

  const residentialSections: QuestionSection[] = [
    {
      title: 'نمط الحياة',
      questions: [
        {
          id: 'res_lifestyle_familyTime',
          label: 'كيف يقضي أفراد الأسرة أغلب وقتهم في البيت؟',
          type: 'radio',
          options: ['تجمع عائلي', 'هدوء وخصوصية', 'ضيوف كثير', 'عمل من المنزل'],
        },
        {
          id: 'res_lifestyle_openSpaces',
          label: 'هل تحب الفراغات المفتوحة أم المغلقة؟',
          type: 'radio',
          options: ['مفتوحة', 'شبه مفتوحة', 'مغلقة تماماً'],
        },
        {
          id: 'res_livingRoom',
          label: 'هل تحب أن تكون الصالة:',
          type: 'radio',
          options: ['قريبة من المدخل', 'معزولة عن الضيوف', 'مرتبطة بالمطبخ'],
        },
        {
          id: 'res_dailyActivities',
          label: 'هل هناك أنشطة يومية تحتاج فراغ مخصص؟',
          type: 'checkbox',
          options: ['رياضة', 'قراءة', 'لعب أطفال', 'مجلس قهوة', 'جلسة خارجية'],
        },
      ],
    },
    {
      title: 'الخصوصية',
      questions: [
        {
          id: 'res_privacy_level',
          label: 'مستوى الخصوصية المطلوب؟',
          type: 'radio',
          options: ['عالي', 'متوسط', 'مفتوح'],
        },
        {
          id: 'res_gender_separation',
          label: 'فصل الرجال عن النساء؟',
          type: 'radio',
          options: ['نعم', 'لا', 'جزئي'],
        },
        {
          id: 'res_privacy_features',
          label: 'هل تحب:',
          type: 'checkbox',
          options: ['مدخل ضيوف مستقل', 'مجلس مستقل', 'دورة مياه ضيوف خارجية'],
        },
        {
          id: 'res_windows',
          label: 'النوافذ:',
          type: 'radio',
          options: ['مفتوحة', 'موجهة', 'مخفية عن الجيران'],
        },
      ],
    },
    {
      title: 'الأسرة والاستخدام الفعلي',
      questions: [
        { id: 'res_family_size', label: 'عدد أفراد الأسرة حالياً؟', type: 'number', placeholder: 'مثال: 6' },
        { id: 'res_family_growth', label: 'هل تتوقع زيادة مستقبلية؟', type: 'radio', options: ['نعم', 'لا'] },
        { id: 'res_family_ages', label: 'أعمار أفراد الأسرة؟', type: 'checkbox', options: ['أطفال', 'مراهقين'] },
        { id: 'res_elderly_room', label: 'هل تحتاج غرفة أرضية لكبار السن؟', type: 'radio', options: ['نعم', 'لا'] },
        {
          id: 'res_nanny_driver_room',
          label: 'غرفة مربية / سائق؟',
          type: 'radio',
          options: ['غرفة مربية', 'غرفة سائق', 'غرفة مربية وسائق', 'لا'],
        },
        { id: 'res_multiuse_room', label: 'غرفة متعددة الاستخدام؟', type: 'radio', options: ['نعم', 'لا'] },
      ],
    },
    {
      title: 'أسلوب الحياة اليومي',
      questions: [
        { id: 'res_cooking_style', label: 'هل تطبخون يومياً أو طبخ خفيف؟', type: 'radio', options: ['يومي', 'خفيف'] },
        { id: 'res_kitchen_type', label: 'هل تحب المطبخ:', type: 'radio', options: ['مفتوح', 'مغلق', 'مطبخ + تحضيري'] },
        { id: 'res_laundry', label: 'هل الغسيل:', type: 'radio', options: ['داخل البيت', 'في السطح', 'في ملحق'] },
        {
          id: 'res_storage',
          label: 'التخزين:',
          type: 'radio',
          options: ['بسيط', 'متوسط', 'كثير (مستودع/غرف تخزين)'],
        },
      ],
    },
    {
      title: 'الذوق والتوجه المعماري',
      questions: [
        {
          id: 'res_style',
          label: 'أي وصف أقرب لذوقك؟',
          type: 'radio',
          options: ['بسيط وهادئ', 'فخم', 'عملي', 'دافئ', 'عصري'],
        },
        {
          id: 'res_ceiling_height',
          label: 'تحب الفراغات:',
          type: 'radio',
          options: ['عالية السقف', 'عادية', 'مزدوجة الارتفاع'],
        },
        {
          id: 'res_natural_light',
          label: 'هل تحب الإضاءة الطبيعية؟',
          type: 'radio',
          options: ['جداً', 'متوسطة', 'قليلة'],
        },
      ],
    },
    {
      title: 'القيود',
      questions: [
        {
          id: 'res_land_shape',
          label: 'هل الأرض:',
          type: 'radio',
          options: ['منتظمة', 'زاوية', 'غير منتظمة'],
        },
      ],
    },
    {
      title: 'توضيحات من أجل راحتك',
      questions: [
        { id: 'res_annoying', label: 'أكثر شيء يزعجك في بيتك الحالي؟', type: 'textarea', rows: 3 },
        { id: 'res_favorite', label: 'أكثر شيء تحبه وتريد تكراره؟', type: 'textarea', rows: 3 },
        { id: 'res_regrets', label: 'هل سبق سكنت بيت وقلت: “لو رجع الزمن غيرت كذا”؟', type: 'textarea', rows: 3 },
        {
          id: 'res_feelings',
          label: 'كيف تحب تحس لما تدخل بيتك؟',
          type: 'checkbox',
          options: ['آمن', 'فخم', 'مريح', 'هادئ', 'منظم', 'مفتوح', 'دافئ'],
        },
        {
          id: 'res_free_text',
          label: 'فضفضة التخطيط - اكتب لنا ما في خاطرك',
          type: 'textarea',
          rows: 4,
          placeholder: 'أفكار، رغبات، ملاحظات، أمنيات...',
        },
      ],
    },
  ]

  const commercialSections: QuestionSection[] = [
    {
      title: 'الاحتياجات الرئيسية',
      questions: [
        {
          id: 'com_special_spaces',
          label: 'هل تحتاج مساحات خاصة؟',
          type: 'checkbox',
          options: [
            'مخزن',
            'مكتب إداري',
            'استراحة موظفين',
            'دورات مياه',
            'مطبخ/غرفة تحضير (للمطاعم)',
            'غرفة استقبال/استعلام',
          ],
        },
        {
          id: 'com_staff_count',
          label: 'عدد الموظفين المتوقع؟',
          type: 'radio',
          options: ['1–5', '6–10', '11–20', 'أكثر من 20'],
        },
        {
          id: 'com_parking_needed',
          label: 'هل تحتاج مواقف سيارات؟',
          type: 'radio',
          options: ['نعم', 'لا'],
        },
        {
          id: 'com_parking_count',
          label: '(إذا نعم) كم موقف تقريباً؟',
          type: 'number',
          showWhen: (data) => data.com_parking_needed === 'نعم',
        },
        {
          id: 'com_activity_level',
          label: 'مستوى الخصوصية أو الحركة؟',
          type: 'radio',
          options: ['نشاط هادئ (مكاتب/عيادات)', 'نشاط عالي الحركة (محل/مطعم)'],
        },
        {
          id: 'com_priority',
          label: 'فكرة بهمك وجودها في المكان؟',
          type: 'checkbox',
          options: ['تخطيط عملي', 'مساحة مفتوحة', 'إطلالة', 'استغلال المساحة بالكامل', 'تكاليف منخفضة', 'شكل فاخر'],
        },
        {
          id: 'com_free_text',
          label: 'فضفضة التخطيط - اكتب ما في بالك',
          type: 'textarea',
          rows: 4,
        },
      ],
    },
  ]

  const serviceSections: QuestionSection[] = [
    {
      title: 'معلومات الاستخدام',
      questions: [
        {
          id: 'srv_target_group',
          label: 'الفئة المستفيدة؟',
          type: 'checkbox',
          options: ['أطفال', 'شباب', 'نساء', 'عائلات', 'كبار سن', 'الجميع'],
        },
        { id: 'srv_daily_users', label: 'عدد المستخدمين اليومي (تقريبي)', type: 'number' },
        {
          id: 'srv_usage_pattern',
          label: 'هل الاستخدام مستمر أو في أوقات محددة؟',
          type: 'radio',
          options: ['مستمر', 'أوقات محددة'],
        },
        {
          id: 'srv_movement_level',
          label: 'الحركة والخصوصية؟',
          type: 'radio',
          options: ['حركة عالية (دخول وخروج مستمر)', 'حركة متوسطة', 'حركة محدودة'],
        },
        {
          id: 'srv_privacy_level',
          label: 'مستوى الخصوصية؟',
          type: 'radio',
          options: ['عالي', 'متوسط', 'مفتوح'],
        },
        {
          id: 'srv_required_spaces',
          label: 'الفراغات الأساسية المطلوبة',
          type: 'checkbox',
          options: ['قاعات / فصول', 'مكاتب إدارية', 'صالة استقبال', 'دورات مياه', 'مستودع', 'مصلى', 'غرف خدمات'],
        },
        {
          id: 'srv_special_entries',
          label: 'هل يحتاج مداخل خاصة؟',
          type: 'checkbox',
          options: ['ذوي الإعاقة', 'كبار السن', 'أطفال'],
        },
        { id: 'srv_parking_count', label: 'عدد تقريبي للمواقف', type: 'number' },
        {
          id: 'srv_special_requirements',
          label: 'اشتراطات أو متطلبات خاصة؟',
          type: 'checkbox',
          options: ['اشتراطات وزارة / جهة رسمية', 'معايير صحية / تعليمية', 'فصل مسارات (رجال/نساء – موظفين/مستفيدين)'],
        },
        {
          id: 'srv_notes',
          label: 'فضفضة التخطيط - اكتب ما في خاطرك',
          type: 'textarea',
          rows: 4,
          placeholder: 'أي تفاصيل أو رغبات إضافية مهمة بالنسبة لك...',
        },
      ],
    },
  ]

  const touristicSections: QuestionSection[] = [
    {
      title: 'بيانات المشروع السياحي',
      questions: [
        {
          id: 'tour_units_count',
          label: 'عدد الوحدات؟',
          type: 'radio',
          options: ['وحدة واحدة', '2–5 وحدات', '6–10 وحدات', 'أكثر من 10'],
        },
        {
          id: 'tour_site_type',
          label: 'طبيعة المشروع؟',
          type: 'radio',
          options: ['ساحلي', 'جبلي', 'صحراوي', 'داخل مدينة', 'ريفي'],
        },
        {
          id: 'tour_target_group',
          label: 'الفئة المستهدفة؟',
          type: 'checkbox',
          options: ['عائلات', 'أفراد', 'شباب', 'عوائل + أطفال', 'سياحة فاخرة', 'اقتصادية'],
        },
        {
          id: 'tour_privacy_level',
          label: 'مستوى الخصوصية؟',
          type: 'radio',
          options: ['عالي', 'متوسط', 'مفتوح'],
        },
        {
          id: 'tour_required_spaces',
          label: 'الفراغات المطلوبة؟',
          type: 'checkbox',
          options: ['غرف نوم', 'صالة', 'مطبخ / كيتشينيت', 'جلسات خارجية', 'مسبح', 'منطقة شواء', 'منطقة ألعاب', 'مواقف سيارات'],
        },
        {
          id: 'tour_first_impression',
          label: 'كيف تحب أن تكون الانطباع الأول للزائر عند الوصول؟',
          type: 'radio',
          options: ['مريح', 'فاخر', 'هادئ', 'طبيعي', 'ممتع', 'خاص'],
        },
        {
          id: 'tour_planning_preference',
          label: 'ما التوجّه الذي تفضّله في التخطيط؟',
          type: 'radio',
          options: ['تخطيط عملي ذكي', 'تجربة تخطيط مميزة بتفاصيل أكثر'],
        },
        {
          id: 'tour_notes',
          label: 'فضفضة التخطيط - اكتب ما في خاطرك',
          type: 'textarea',
          rows: 4,
          placeholder: 'أي تفاصيل أو رغبات إضافية مهمة بالنسبة لك...',
        },
      ],
    },
  ]

  const getSectionsForCategory = (category: string): QuestionSection[] => {
    switch (category) {
      case 'residential':
        return residentialSections
      case 'commercial':
        return commercialSections
      case 'service':
        return serviceSections
      case 'touristic':
        return touristicSections
      default:
        return []
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future addon toggle UI
  const handleToggleAddon = (addonId: string) => {
    setSelectedAddons(prev => {
      const newAddons = prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
      storage.set('order_selected_addons', newAddons)
      return newAddons
    })
  }

  const numericFormKeys = [
    'landArea', 'landLength', 'landWidth', 'landDepth', 'floorsCount', 'facadeCount',
    'res_family_size', 'com_parking_count', 'srv_daily_users', 'srv_parking_count',
  ] as const
  const arrayFormKeys = [
    'res_dailyActivities', 'res_privacy_features', 'res_family_ages', 'res_feelings',
    'com_special_spaces', 'com_priority', 'srv_target_group', 'srv_required_spaces',
    'srv_special_entries', 'srv_special_requirements', 'tour_target_group', 'tour_required_spaces',
  ] as const

  const normalizeFormDataForSubmit = (data: Record<string, unknown>, addons: string[]) => {
    const out: Record<string, unknown> = { ...data, selectedAddons: addons }
    for (const k of numericFormKeys) {
      const v = data[k]
      if (v != null && (typeof v === 'string' || typeof v === 'number')) {
        const t = String(v).trim()
        out[k] = t
      }
    }
    for (const k of arrayFormKeys) {
      const v = data[k]
      out[k] = Array.isArray(v) ? v.map((x) => String(x)) : []
    }
    return out
  }

  const handleSubmit = async () => {
    if (!selectedPackage) {
      toast.error('يرجى اختيار باقة أولاً')
      router.push('/orders/select-package')
      return
    }

    // Validate all required steps (including step 3 – detailed questions)
    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      if (!validateStep1()) setCurrentStep(0)
      else if (!validateStep2()) setCurrentStep(1)
      else if (!validateStep3()) setCurrentStep(2)
      toast.error('يرجى إدخال جميع البيانات المطلوبة بشكل صحيح')
      return
    }

    setSubmitting(true)
    try {
      const finalFormData = normalizeFormDataForSubmit(formData, selectedAddons)

      const result = await apiClient.post<{ success: boolean; order?: { id: string } }>('/orders/create', {
        packageId: selectedPackage.id,
        formData: finalFormData,
      })

      if (result.success && result.order) {
        // Clear saved form data after successful submission
        storage.remove('order_form_data')
        storage.remove('order_form_step')
        storage.remove('order_selected_package')
        storage.remove('order_selected_addons')
        
        toast.success('تم إنشاء الطلب بنجاح')
        // Redirect to payment page
        router.push(`/orders/${result.order.id}/payment`)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل إنشاء الطلب'
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  const currentStepData = formSteps[currentStep]
  const StepIcon = currentStepData.icon

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Step 1: Basic Info
        {
          const selectedRegion = typeof formData.region === 'string' ? formData.region : ''
          const selectedCity = typeof formData.city === 'string' ? formData.city : ''
          const selectedDistrict = typeof formData.district === 'string' ? formData.district : ''
          const selectedFacadeDirection =
            typeof formData.facadeDirection === 'string' ? formData.facadeDirection : ''
          const cities = selectedRegion ? getCitiesForRegion(selectedRegion) : []
          const districts = selectedCity ? getDistrictsForCity(selectedCity) : []
          const lengthText = getIntegerString(formData.landLength)
          const widthText = getIntegerString(formData.landWidth)
          const areaText = getIntegerString(formData.landArea)
          const expectedArea =
            lengthText && widthText ? Number(lengthText) * Number(widthText) : null
          const isAreaMismatch =
            expectedArea !== null && areaText !== null && Number(areaText) !== expectedArea
          const suggestedLength =
            areaText && widthText && Number(widthText) > 0
              ? Number(areaText) / Number(widthText)
              : null
          const suggestedWidth =
            areaText && lengthText && Number(lengthText) > 0
              ? Number(areaText) / Number(lengthText)
              : null
          const facadeDirectionDescriptions: Record<string, string> = {
            شمال: 'الأبرد، إضاءة غير مباشرة، مفضلة للسكن.',
            شرق: 'شمس الصباح، برودة في المساء.',
            غرب: 'شمس العصر القوية، حرارة في المساء.',
            جنوب: 'دافئة شتاءً، مشمسة طوال اليوم.',
            'شمال شرقي': 'تجمع بين البرودة وإشراقة الصباح - الأغلى طلباً.',
            'شمال غربي': 'برودة نهارية مع شمس عصر.',
            'جنوب شرقي': 'دافئة جداً ومشمسة صباحاً.',
            'جنوب غربي': 'الأكثر حرارة وتخزيناً للشمس.',
          }
          const facadeDirectionNote = facadeDirectionDescriptions[selectedFacadeDirection]

          return (
            <div className="space-y-6">
              {/* Project Type */}
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                  نوع المشروع <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`relative flex items-center p-4 border-2 rounded-none cursor-pointer transition-all ${
                    formData.projectType === 'new'
                      ? 'border-rocky-blue dark:border-rocky-blue-600 bg-rocky-blue/10 dark:bg-rocky-blue/20'
                      : 'border-greige/30 dark:border-charcoal-600 bg-white dark:bg-charcoal-700'
                  }`}>
                    <input
                      type="radio"
                      name="projectType"
                      value="new"
                      checked={formData.projectType === 'new'}
                      onChange={(e) => handleInputChange('projectType', e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-charcoal dark:text-cream font-medium">مخطط معماري جديد</span>
                  </label>
                  <label className={`relative flex items-center p-4 border-2 rounded-none cursor-pointer transition-all ${
                    formData.projectType === 'renovation'
                      ? 'border-rocky-blue dark:border-rocky-blue-600 bg-rocky-blue/10 dark:bg-rocky-blue/20'
                      : 'border-greige/30 dark:border-charcoal-600 bg-white dark:bg-charcoal-700'
                  }`}>
                    <input
                      type="radio"
                      name="projectType"
                      value="renovation"
                      checked={formData.projectType === 'renovation'}
                      onChange={(e) => handleInputChange('projectType', e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-charcoal dark:text-cream font-medium">تطوير مخطط قائم</span>
                  </label>
                </div>
                {errors.projectType && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.projectType}</p>
                )}
              </div>

              {/* Region */}
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                  المنطقة <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-none focus:ring-2 focus:ring-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream ${
                    errors.region
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-greige/30 dark:border-charcoal-600'
                  }`}
                >
                  <option value="">اختر المنطقة...</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                {errors.region && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.region}</p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                  المدينة <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  disabled={!selectedRegion}
                  className={`w-full px-4 py-2 border rounded-none focus:ring-2 focus:ring-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream ${
                    errors.city
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-greige/30 dark:border-charcoal-600'
                  } ${!selectedRegion ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <option value="">اختر المدينة...</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.city}</p>
                )}
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                  الحي <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  disabled={!selectedCity}
                  className={`w-full px-4 py-2 border rounded-none focus:ring-2 focus:ring-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream ${
                    errors.district
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-greige/30 dark:border-charcoal-600'
                  } ${!selectedCity ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <option value="">اختر الحي...</option>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                {errors.district && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.district}</p>
                )}
              </div>

              {selectedDistrict === otherOption && (
                <div>
                  <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                    أدخل اسم الحي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={String(formData.districtOther || '')}
                    onChange={(e) => handleInputChange('districtOther', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-none focus:ring-2 focus:ring-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream ${
                      errors.districtOther
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-greige/30 dark:border-charcoal-600'
                    }`}
                    placeholder="اكتب اسم الحي"
                  />
                  {errors.districtOther && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.districtOther}</p>
                  )}
                </div>
              )}

            {/* Land Area */}
            <div>
              <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                مساحة الأرض (م²) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={getStringValue(formData.landArea)}
                onChange={(e) => handleInputChange('landArea', e.target.value)}
                className={`w-full px-4 py-2 border rounded-none focus:ring-2 focus:ring-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream ${
                  errors.landArea 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-greige/30 dark:border-charcoal-600'
                }`}
                placeholder="مثال: 500"
              />
              {errors.landArea && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.landArea}</p>
              )}
              {isAreaMismatch && (
                <div className="mt-2 rounded-none border border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-200">
                  المساحة لا تطابق الطول × العرض. الرقم الصحيح: {expectedArea} م²
                  {(suggestedLength !== null || suggestedWidth !== null) && (
                    <div className="mt-2 space-y-1">
                      {suggestedLength !== null && (
                        <p>الطول المتوقع بناءً على المساحة والعرض: {formatSuggestionNumber(suggestedLength)} م</p>
                      )}
                      {suggestedWidth !== null && (
                        <p>العرض المتوقع بناءً على المساحة والطول: {formatSuggestionNumber(suggestedWidth)} م</p>
                      )}
                    </div>
                  )}
                  <label className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.landAreaOverride)}
                      onChange={(e) => handleInputChange('landAreaOverride', e.target.checked)}
                    />
                    أؤكد اعتماد المساحة المدخلة كما هي
                  </label>
                </div>
              )}
              <p className="mt-2 text-xs text-blue-gray dark:text-greige">
                تُحسب المساحة تلقائياً من الطول × العرض ويمكنك تعديلها يدوياً. العمق اختياري للأراضي غير المنتظمة.
              </p>
            </div>

            {/* Facade Count */}
            <div>
              <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                عدد الواجهات <span className="text-red-500">*</span>
              </label>
              <select
                value={String(formData.facadeCount || '')}
                onChange={(e) => handleInputChange('facadeCount', e.target.value)}
                className={`w-full px-4 py-2 border rounded-none focus:ring-2 focus:ring-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream ${
                  errors.facadeCount 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-greige/30 dark:border-charcoal-600'
                }`}
              >
                <option value="">اختر...</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              {errors.facadeCount && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.facadeCount}</p>
              )}
            </div>

            {/* Floors Count */}
            <div>
              <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                عدد الطوابق <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={getStringValue(formData.floorsCount)}
                onChange={(e) => handleInputChange('floorsCount', e.target.value)}
                className={`w-full px-4 py-2 border rounded-none focus:ring-2 focus:ring-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream ${
                  errors.floorsCount 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-greige/30 dark:border-charcoal-600'
                }`}
                placeholder="مثال: 2"
              />
              {errors.floorsCount && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.floorsCount}</p>
              )}
            </div>

            {/* Land Dimensions */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                  الطول (م) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={getStringValue(formData.landLength)}
                  onChange={(e) => handleInputChange('landLength', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-none focus:ring-2 focus:ring-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream ${
                    errors.landLength 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-greige/30 dark:border-charcoal-600'
                  }`}
                />
                {errors.landLength && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.landLength}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                  العرض (م) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={getStringValue(formData.landWidth)}
                  onChange={(e) => handleInputChange('landWidth', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-none focus:ring-2 focus:ring-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream ${
                    errors.landWidth 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-greige/30 dark:border-charcoal-600'
                  }`}
                />
                {errors.landWidth && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.landWidth}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                  العمق (م)
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={getStringValue(formData.landDepth)}
                  onChange={(e) => handleInputChange('landDepth', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-none focus:ring-2 focus:ring-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream ${
                    errors.landDepth ? 'border-red-500 dark:border-red-500' : 'border-greige/30 dark:border-charcoal-600'
                  }`}
                />
                {errors.landDepth && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.landDepth}</p>
                )}
              </div>
            </div>

            {/* Facade Direction */}
            <div>
              <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                اتجاه الواجهات <span className="text-red-500">*</span>
              </label>
              <select
                value={String(formData.facadeDirection || '')}
                onChange={(e) => handleInputChange('facadeDirection', e.target.value)}
                className={`w-full px-4 py-2 border rounded-none focus:ring-2 focus:ring-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream ${
                  errors.facadeDirection 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-greige/30 dark:border-charcoal-600'
                }`}
              >
                <option value="">اختر الاتجاه...</option>
                <option value="شمال">شمال</option>
                <option value="شرق">شرق</option>
                <option value="غرب">غرب</option>
                <option value="جنوب">جنوب</option>
                <option value="شمال شرقي">شمال شرقي</option>
                <option value="شمال غربي">شمال غربي</option>
                <option value="جنوب شرقي">جنوب شرقي</option>
                <option value="جنوب غربي">جنوب غربي</option>
              </select>
              {errors.facadeDirection && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.facadeDirection}</p>
              )}
              {facadeDirectionNote && (
                <p className="mt-2 text-xs text-blue-gray dark:text-greige">
                  {facadeDirectionNote}
                </p>
              )}
            </div>

            {/* Confirm dimensions */}
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleConfirmDimensions}
                className="w-full sm:w-auto"
              >
                تأكيد الأبعاد
              </Button>
              {Boolean(formData.dimensionsConfirmed) && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                  تم التأكيد — الأبعاد صحيحة
                </p>
              )}
            </div>
            </div>
          )
        }

      case 1: // Step 2: Project Type
        return (
          <div className="space-y-6">
            <p className="text-blue-gray dark:text-greige mb-6">
              اختر نوع الاستخدام الذي تريد تصميمه
            </p>
            <div className="grid grid-cols-2 gap-6">
              {projectCategories.map((category) => {
                const CategoryIcon = category.icon
                const isSelected = formData.projectCategory === category.value
                return (
                  <label
                    key={category.value}
                    className={`relative flex flex-col items-center p-8 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? 'border-rocky-blue dark:border-rocky-blue-600 bg-rocky-blue/5 dark:bg-rocky-blue/10 shadow-lg ring-2 ring-rocky-blue/20 dark:ring-rocky-blue-400/20'
                        : 'border-greige/30 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 hover:border-rocky-blue/50 dark:hover:border-rocky-blue-500 hover:shadow-md hover:bg-greige/5 dark:hover:bg-charcoal-600/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="projectCategory"
                      value={category.value}
                      checked={isSelected}
                      onChange={(e) => handleInputChange('projectCategory', e.target.value)}
                      className="sr-only"
                    />
                    
                    {/* أيقونة نوع الاستخدام */}
                    <div className={`w-28 h-28 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 border-2 ${
                      isSelected
                        ? 'bg-rocky-blue dark:bg-rocky-blue-600 border-rocky-blue dark:border-rocky-blue-500 shadow-xl scale-105'
                        : 'bg-greige/10 dark:bg-charcoal-600 border-greige/20 dark:border-charcoal-500 hover:scale-105 hover:border-rocky-blue/30 dark:hover:border-rocky-blue-500/30'
                    }`}>
                      <CategoryIcon className={`w-14 h-14 transition-colors duration-300 ${
                        isSelected 
                          ? 'text-cream' 
                          : 'text-rocky-blue dark:text-rocky-blue-300'
                      }`} strokeWidth={1.75} />
                    </div>
                    
                    <span className={`text-xl font-black mb-2 ${
                      isSelected
                        ? 'text-rocky-blue dark:text-rocky-blue-300'
                        : 'text-charcoal dark:text-cream'
                    }`}>
                      {category.label}
                    </span>
                    <span className="text-sm text-blue-gray dark:text-greige text-center">
                      {category.description}
                    </span>
                    
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-8 h-8 bg-rocky-blue dark:bg-rocky-blue-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-cream" />
                      </div>
                    )}
                  </label>
                )
              })}
            </div>
            {errors.projectCategory && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.projectCategory}</p>
            )}
          </div>
        )

      case 2: // Step 3: Project Details — الأسئلة التفصيلية
        {
          const category = typeof formData.projectCategory === 'string' ? formData.projectCategory : ''
          const sections = getSectionsForCategory(category)
          if (!category) {
            return (
              <div className="text-center py-12 border border-greige/30 dark:border-charcoal-600 rounded-xl">
                <p className="text-blue-gray dark:text-greige">يرجى اختيار نوع الاستخدام أولاً</p>
              </div>
            )
          }
          const totalQuestions = sections.reduce((acc, s) => acc + s.questions.filter(q => !q.showWhen || q.showWhen(formData)).length, 0)
          const answeredCount = sections.reduce((acc, s) => {
            return acc + s.questions.filter(q => {
              if (q.showWhen && !q.showWhen(formData)) return false
              const v = formData[q.id]
              if (q.type === 'radio' || q.type === 'text' || q.type === 'number' || q.type === 'textarea') return typeof v === 'string' ? v.trim() !== '' : v != null && String(v).trim() !== ''
              if (q.type === 'checkbox') return Array.isArray(v) && v.length > 0
              return false
            }).length
          }, 0)
          return (
            <div className="space-y-6">
              {/* ملاحظة الحفظ التلقائي وتقدّم الإجابة */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-greige/10 dark:bg-charcoal-700/50 border border-greige/20 dark:border-charcoal-600">
                <p className="text-sm text-blue-gray dark:text-greige flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rocky-blue dark:text-rocky-blue-400 flex-shrink-0" />
                  يتم حفظ إجاباتك تلقائياً — لا تحتاج الضغط على حفظ
                </p>
                {totalQuestions > 0 && (
                  <p className="text-sm font-medium text-charcoal dark:text-cream">
                    تم الإجابة على <span className="text-rocky-blue dark:text-rocky-blue-300 font-bold">{answeredCount}</span> من <span className="font-bold">{totalQuestions}</span> سؤال
                  </p>
                )}
              </div>

              {sections.map((section, sectionIdx) => {
                const visibleQuestions = section.questions.filter(q => !q.showWhen || q.showWhen(formData))
                if (visibleQuestions.length === 0) return null
                return (
                  <div
                    key={section.title}
                    className="rounded-xl border-2 border-greige/20 dark:border-charcoal-600 bg-white/50 dark:bg-charcoal-800/50 p-6 space-y-6"
                  >
                    <div className="flex items-center gap-3 pb-2 border-b border-greige/30 dark:border-charcoal-600">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300 font-black text-sm">
                        {sectionIdx + 1}
                      </span>
                      <h3 className="text-lg font-bold text-charcoal dark:text-cream">{section.title}</h3>
                    </div>
                    <div className="space-y-6">
                      {section.questions.map((question) => renderQuestion(question))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }

      case 3: // Step 4: Addons
        {
          const addonsText = getStringValue(formData.addonsNotes)
          const addonsLimit = 500
          return (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                  إضافات أو ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  value={addonsText}
                  onChange={(e) => handleInputChange('addonsNotes', e.target.value)}
                  rows={4}
                  maxLength={addonsLimit}
                  className="w-full px-4 py-2 border rounded-none focus:ring-2 focus:ring-rocky-blue bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream placeholder:text-blue-gray dark:placeholder:text-greige border-greige/30 dark:border-charcoal-600"
                  placeholder="اكتب أي إضافات أو رغبات إضافية ترغب بإضافتها للمشروع"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-blue-gray dark:text-greige">
                  <span>يمكن كتابة أي إضافات أو نقاط تريد التركيز عليها، وسيطلع عليها فريق التصميم.</span>
                  <span>{addonsText.length}/{addonsLimit}</span>
                </div>
              </div>
            </div>
          )
        }

      case 4: // Step 5: Review — صفحة المراجعة
        {
          const cityValue =
            typeof formData.city === 'string'
              ? formData.city
              : typeof formData.location === 'string'
              ? formData.location
              : '-'
          const districtValue =
            formData.district === otherOption && formData.districtOther
              ? String(formData.districtOther)
              : typeof formData.district === 'string'
              ? formData.district
              : '-'
          const categoryLabel = String(
            projectCategories.find((c) => c.value === formData.projectCategory)?.label ?? '-'
          )
          const categorySections = getSectionsForCategory(
            typeof formData.projectCategory === 'string' ? formData.projectCategory : ''
          )
          const basicInfoRows = [
            { label: 'نوع المشروع', value: formData.projectType === 'new' ? 'مخطط معماري جديد' : 'تطوير مخطط قائم' },
            { label: 'المنطقة', value: typeof formData.region === 'string' ? formData.region : '-' },
            { label: 'المدينة', value: cityValue },
            { label: 'الحي', value: districtValue },
            { label: 'مساحة الأرض', value: (typeof formData.landArea === 'string' || typeof formData.landArea === 'number' ? String(formData.landArea) : '-') + ' م²' },
            { label: 'الأبعاد', value: `${typeof formData.landLength === 'string' || typeof formData.landLength === 'number' ? String(formData.landLength) : '-'} × ${typeof formData.landWidth === 'string' || typeof formData.landWidth === 'number' ? String(formData.landWidth) : '-'} م` },
            { label: 'عدد الواجهات', value: typeof formData.facadeCount === 'string' || typeof formData.facadeCount === 'number' ? String(formData.facadeCount) : '-' },
            { label: 'اتجاه الواجهات', value: typeof formData.facadeDirection === 'string' && formData.facadeDirection !== '' ? formData.facadeDirection : '-' },
            { label: 'عدد الطوابق', value: typeof formData.floorsCount === 'string' || typeof formData.floorsCount === 'number' ? String(formData.floorsCount) : '-' },
          ]

          return (
            <div className="space-y-6">
              {/* ترويسة المراجعة */}
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-greige/10 dark:bg-charcoal-700/50 border border-greige/20 dark:border-charcoal-600">
                <div className="w-10 h-10 rounded-lg bg-rocky-blue/10 dark:bg-rocky-blue/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-rocky-blue dark:text-rocky-blue-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-charcoal dark:text-cream">مراجعة طلبك</h3>
                  <p className="text-sm text-blue-gray dark:text-greige mt-0.5">تأكد من البيانات ثم اضغط إرسال الطلب</p>
                </div>
              </div>

              {/* المعلومات الأساسية */}
              <div className="rounded-xl border-2 border-greige/20 dark:border-charcoal-600 bg-white/50 dark:bg-charcoal-800/50 p-6">
                <div className="flex items-center gap-3 pb-3 mb-4 border-b border-greige/30 dark:border-charcoal-600">
                  <div className="w-9 h-9 rounded-lg bg-rocky-blue/10 dark:bg-rocky-blue/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-rocky-blue dark:text-rocky-blue-300" />
                  </div>
                  <h3 className="text-lg font-bold text-charcoal dark:text-cream">المعلومات الأساسية</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {basicInfoRows.map((row) => (
                    <div key={row.label} className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 px-3 rounded-lg bg-greige/5 dark:bg-charcoal-700/30">
                      <span className="text-sm text-blue-gray dark:text-greige font-medium">{row.label}</span>
                      <span className="text-sm font-semibold text-charcoal dark:text-cream">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* نوع الاستخدام */}
              <div className="rounded-xl border-2 border-greige/20 dark:border-charcoal-600 bg-white/50 dark:bg-charcoal-800/50 p-6">
                <div className="flex items-center gap-3 pb-3 mb-3 border-b border-greige/30 dark:border-charcoal-600">
                  <div className="w-9 h-9 rounded-lg bg-rocky-blue/10 dark:bg-rocky-blue/20 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-rocky-blue dark:text-rocky-blue-300" />
                  </div>
                  <h3 className="text-lg font-bold text-charcoal dark:text-cream">نوع الاستخدام</h3>
                </div>
                <p className="text-charcoal dark:text-cream font-medium">{categoryLabel}</p>
              </div>

              {/* الأسئلة التفصيلية */}
              {categorySections.length > 0 && (
                <div className="rounded-xl border-2 border-greige/20 dark:border-charcoal-600 bg-white/50 dark:bg-charcoal-800/50 p-6">
                  <div className="flex items-center gap-3 pb-3 mb-4 border-b border-greige/30 dark:border-charcoal-600">
                    <div className="w-9 h-9 rounded-lg bg-rocky-blue/10 dark:bg-rocky-blue/20 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-rocky-blue dark:text-rocky-blue-300" />
                    </div>
                    <h3 className="text-lg font-bold text-charcoal dark:text-cream">الأسئلة التفصيلية</h3>
                  </div>
                  <div className="space-y-5">
                    {categorySections.map((section) => {
                      const visibleQuestions = section.questions.filter(q => !q.showWhen || q.showWhen(formData))
                      if (visibleQuestions.length === 0) return null
                      return (
                        <div key={section.title} className="space-y-3">
                          <h4 className="font-semibold text-charcoal dark:text-cream text-sm flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-greige/20 dark:bg-charcoal-600 flex items-center justify-center text-xs font-bold text-rocky-blue dark:text-rocky-blue-300">•</span>
                            {section.title}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {visibleQuestions.map((question) => {
                              const value = formData[question.id]
                              const displayValue = Array.isArray(value)
                                ? value.map((x) => String(x)).join('، ')
                                : value != null && String(value).trim() !== ''
                                ? String(value).trim()
                                : '-'
                              return (
                                <div key={question.id} className="flex flex-col gap-0.5 py-2 px-3 rounded-lg bg-greige/5 dark:bg-charcoal-700/30">
                                  <span className="text-xs text-blue-gray dark:text-greige">{question.label}</span>
                                  <span className="text-sm font-medium text-charcoal dark:text-cream">{displayValue}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* الباقة المختارة */}
              {selectedPackage && (
                <div className="rounded-xl border-2 border-rocky-blue/30 dark:border-rocky-blue-500/30 bg-rocky-blue/5 dark:bg-rocky-blue-900/20 p-6">
                  <div className="flex items-center gap-3 pb-3 mb-4 border-b border-rocky-blue/20 dark:border-rocky-blue-500/20">
                    <div className="w-9 h-9 rounded-lg bg-rocky-blue/20 dark:bg-rocky-blue/30 flex items-center justify-center">
                      <Package className="w-4 h-4 text-rocky-blue dark:text-rocky-blue-300" />
                    </div>
                    <h3 className="text-lg font-bold text-charcoal dark:text-cream">الباقة المختارة</h3>
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="font-bold text-lg text-charcoal dark:text-cream">{selectedPackage.nameAr}</p>
                      <p className="text-sm text-blue-gray dark:text-greige mt-1">
                        {selectedPackage.revisions} تعديلات • {selectedPackage.executionDays} يوم تنفيذ
                      </p>
                    </div>
                    <p className="text-2xl font-black text-rocky-blue dark:text-rocky-blue-300">
                      {selectedPackage.price} <span className="text-base font-bold text-charcoal dark:text-cream">ريال</span>
                    </p>
                  </div>
                </div>
              )}

              {/* الإضافات المطلوبة */}
              {(typeof formData.addonsNotes === 'string' && formData.addonsNotes.trim() !== '') && (
                <div className="rounded-xl border-2 border-greige/20 dark:border-charcoal-600 bg-white/50 dark:bg-charcoal-800/50 p-6">
                  <div className="flex items-center gap-3 pb-3 mb-3 border-b border-greige/30 dark:border-charcoal-600">
                    <div className="w-9 h-9 rounded-lg bg-rocky-blue/10 dark:bg-rocky-blue/20 flex items-center justify-center">
                      <PackagePlus className="w-4 h-4 text-rocky-blue dark:text-rocky-blue-300" />
                    </div>
                    <h3 className="text-lg font-bold text-charcoal dark:text-cream">الإضافات والملاحظات</h3>
                  </div>
                  <p className="text-charcoal dark:text-cream whitespace-pre-line leading-relaxed">
                    {formData.addonsNotes.trim()}
                  </p>
                </div>
              )}

              {/* رسالة الطمأنة */}
              <div className="rounded-xl p-6 border-2 border-rocky-blue/30 dark:border-rocky-blue-500/30 bg-rocky-blue/5 dark:bg-rocky-blue-900/20 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
                <div className="w-12 h-12 rounded-full bg-rocky-blue/20 dark:bg-rocky-blue/30 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-rocky-blue dark:text-rocky-blue-300" />
                </div>
                <div>
                  <p className="text-charcoal dark:text-cream font-bold">لا تشيل هم…</p>
                  <p className="text-sm text-blue-gray dark:text-greige mt-1">
                    لا تحتاج رؤية مكتملة الآن. يكفينا أن نعرف احتياجك، وسنكون معك خطوة بخطوة حتى يصل التخطيط للشكل الذي يناسبك.
                  </p>
                </div>
              </div>
            </div>
          )
        }

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <div className="mb-6">
          <BackButton href="/dashboard" label="العودة للوحة التحكم" />
        </div>

        {/* Package Info */}
        {selectedPackage && (
          <div className="mb-6 bg-rocky-blue/10 dark:bg-rocky-blue/20 border-2 border-rocky-blue/30 dark:border-rocky-blue-600 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-gray dark:text-greige mb-1">الباقة المختارة</p>
                <p className="text-lg font-bold text-charcoal dark:text-cream">{selectedPackage.nameAr}</p>
                <p className="text-sm text-blue-gray dark:text-greige mt-1">
                  {selectedPackage.revisions} تعديلات • {selectedPackage.executionDays} يوم تنفيذ
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/orders/select-package')}
              >
                تغيير الباقة
              </Button>
            </div>
          </div>
        )}

        {/* Progress Stepper - Clean Design */}
        {selectedPackage && (
          <div className="mb-8 bg-white dark:bg-charcoal-800 border-2 border-greige/30 dark:border-charcoal-600 rounded-lg p-6 shadow-soft dark:shadow-medium"
          >
            {/* Steps Row */}
            <div className="flex items-center justify-between mb-6">
              {formSteps.map((step, idx) => {
                const StepIconComponent = step.icon
                const isActive = idx === currentStep
                const isCompleted = idx < currentStep
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      {/* Icon Circle */}
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
                        isActive
                          ? 'bg-rocky-blue dark:bg-rocky-blue-600 text-cream shadow-lg scale-110'
                          : isCompleted
                          ? 'bg-green-500 dark:bg-green-600 text-cream shadow-md'
                          : 'bg-greige/20 dark:bg-charcoal-700 text-blue-gray dark:text-greige'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-8 h-8" />
                        ) : (
                          <StepIconComponent className="w-8 h-8" />
                        )}
                      </div>
                      
                      {/* Step Title */}
                      <span className={`text-xs font-bold text-center ${
                        isActive
                          ? 'text-rocky-blue dark:text-rocky-blue-300'
                          : isCompleted
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-blue-gray dark:text-greige'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                    
                    {/* Connector Line */}
                    {idx < formSteps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 ${
                        isCompleted ? 'bg-green-500 dark:bg-green-600' : 'bg-greige/30 dark:bg-charcoal-600'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-greige/20 dark:bg-charcoal-700 rounded-full h-2">
              <div
                className="bg-rocky-blue dark:bg-rocky-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentStep + 1) / formSteps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Form Step */}
        {selectedPackage && (
          <div className="bg-white dark:bg-charcoal-800 border-2 border-greige/30 dark:border-charcoal-600 rounded-lg p-6 shadow-soft dark:shadow-medium">
            {/* Step Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-rocky-blue/10 dark:bg-rocky-blue/20 rounded-lg flex items-center justify-center">
                <StepIcon className="w-7 h-7 text-rocky-blue dark:text-rocky-blue-300" />
              </div>
              <h2 className="text-2xl font-black text-charcoal dark:text-cream">
                {currentStepData.title}
              </h2>
            </div>
            
            {renderStepContent()}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-greige/30 dark:border-charcoal-600">
              <Button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                variant="outline"
              >
                <ArrowRight className="w-4 h-4" />
                السابق
              </Button>
              
              {currentStep === formSteps.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  loading={submitting}
                  className="btn-3d"
                >
                  إرسال الطلب
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                >
                  التالي
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {!selectedPackage && (
          <div className="bg-white dark:bg-charcoal-800 border-2 border-greige/30 dark:border-charcoal-600 rounded-lg p-12 text-center shadow-soft dark:shadow-medium">
            <p className="text-blue-gray dark:text-greige mb-4">يرجى اختيار باقة أولاً</p>
            <Button onClick={() => router.push('/orders/select-package')}>
              اختيار الباقة
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}