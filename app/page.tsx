'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { 
  CheckCircle, 
  Clock, 
  FileText, 
  Compass, 
  PenTool, 
  ArrowLeft,
  ChevronDown,
  Phone,
  Mail,
  Layers,
  Target,
  Shield,
  MessageCircle,
  Lightbulb,
  Zap
} from 'lucide-react'
import {
  HastyDecisionsIcon,
  WastedSpacesIcon,
  UnsuitableLayoutIcon
} from '@/components/icons/ArchitecturalIcons'
import { Button } from '@/components/shared/Button'
import { Header } from '@/components/layout/Header'
import { apiClient } from '@/lib/api'

interface Package {
  id: string
  nameAr: string
  nameEn?: string
  price: number
  revisions: number
  executionDays: number
  isActive: boolean
  features?: string[]
}

// FAQ data
const faqs = [
  {
    question: 'ما هي الباقات المتاحة لتصميم الفلل؟',
    answer: 'نوفر ثلاث باقات رئيسية: الباقة الأساسية للتصميم السريع، الباقة القياسية للتصميم الأدق، والباقة المميزة للتصميم الشامل مع جميع الخدمات.',
    icon: Layers
  },
  {
    question: 'كيف يمكنني البدء في مشروع تصميم؟',
    answer: 'ابدأ باختيار الباقة المناسبة، ثم قم بتعبئة نموذج بسيط عن أرضك واحتياجاتك، وسيتواصل معك المهندس المختص.',
    icon: Target
  },
  {
    question: 'هل يمكنني طلب تعديلات على التصميم؟',
    answer: 'نعم، عدد التعديلات يعتمد على الباقة المختارة. يمكنك أيضاً شراء تعديلات إضافية إذا لزم الأمر.',
    icon: PenTool
  },
  {
    question: 'ما هي المدة الزمنية المتوقعة للتسليم؟',
    answer: 'المدة تعتمد على الباقة المختارة، عادةً من 7 إلى 21 يوم عمل حسب تعقيد المشروع.',
    icon: Clock
  },
  {
    question: 'هل توفرون خدمة الإشراف الهندسي؟',
    answer: 'نعم، يمكن توفير خدمة الإشراف الهندسي كإضافة لضمان مطابقة التنفيذ للمخططات.',
    icon: Shield
  }
]

// Process steps
const processSteps = [
  {
    number: '01',
    title: 'تعبئة النموذج',
    description: 'املأ نموذج بسيط عن أرضك واحتياجاتك ونمط حياتك',
    icon: FileText
  },
  {
    number: '02',
    title: 'التحليل والدراسة',
    description: 'مهندسنا يدرس طلبك ويحلل جميع المعطيات بعناية',
    icon: Compass
  },
  {
    number: '03',
    title: 'استلام التصور',
    description: 'تستلم المخطط التخطيطي الأولي للمراجعة',
    icon: Layers
  },
  {
    number: '04',
    title: 'التعديلات',
    description: 'نعدل المخطط حسب ملاحظاتك حتى تصل للنتيجة المطلوبة',
    icon: PenTool
  },
  {
    number: '05',
    title: 'اعتماد الفكرة',
    description: 'تستلم الملفات النهائية جاهزة للتنفيذ',
    icon: CheckCircle
  }
]

const FALLBACK_PACKAGES: Package[] = [
  { id: 'basic', nameAr: 'تخطيط سريع', price: 500, revisions: 2, executionDays: 5, isActive: true },
  { id: 'standard', nameAr: 'تخطيط أدق وأذكى', price: 1000, revisions: 5, executionDays: 7, isActive: true },
  { id: 'premium', nameAr: 'تخطيط شامل', price: 2000, revisions: 10, executionDays: 10, isActive: true }
]

const PACKAGES_FALLBACK_TIMEOUT_MS = 5000

type HomepageContent = {
  hero: { title: string; subtitle: string } | null
  faq: { sectionTitle: string; items: Array<{ question: string; answer: string }> } | null
  cta: { badge: string; title: string; subtitle: string; paragraph: string; features: Array<{ title: string; desc: string }> } | null
  footer: { email: string; phone: string; copyright: string; socialLinks: Array<{ type: string; url: string; visible: boolean }> } | null
}

export default function Home() {
  const { data: session } = useAuth()
  const [packages, setPackages] = useState<Package[]>([])
  const [loadingPackages, setLoadingPackages] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [homepageContent, setHomepageContent] = useState<HomepageContent | null>(null)
  const packagesResolvedRef = useRef(false)

  const fetchHomepageContent = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; content: HomepageContent }>('/content/homepage')
      if (result.success && result.content) setHomepageContent(result.content)
    } catch {
      /* ignore – use fallback */
    }
  }, [])

  useEffect(() => {
    fetchHomepageContent()
  }, [fetchHomepageContent])

  const fetchPackages = useCallback(async () => {
    packagesResolvedRef.current = false
    setLoadingPackages(true)
    const timeoutId = setTimeout(() => {
      if (packagesResolvedRef.current) return
      setPackages(FALLBACK_PACKAGES)
      setLoadingPackages(false)
    }, PACKAGES_FALLBACK_TIMEOUT_MS)
    try {
      const result = await apiClient.get<{ success: boolean; packages: Package[] }>('/packages')
      packagesResolvedRef.current = true
      if (result.success && result.packages) {
        setPackages(result.packages)
      }
    } catch (error: unknown) {
      packagesResolvedRef.current = true
      const errorMessage = error instanceof Error ? error.message : 'فشل تحميل الباقات'
      console.error('Failed to fetch packages:', errorMessage)
      setPackages(FALLBACK_PACKAGES)
    } finally {
      clearTimeout(timeoutId)
      setLoadingPackages(false)
    }
  }, [])

  useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  // Handle hash navigation
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash.slice(1))
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300)
    }
  }, [])

  // المميزات: إن وُجدت مميزات إضافية من إدارة الباقات (سطر واحد لكل ميزة) نعرضها، وإلا نستخدم القائمة الافتراضية
  const getPackageFeatures = (pkg: Package): string[] => {
    if (pkg.features?.length) return pkg.features
    const features = ['مخطط تخطيطي واضح', 'توزيع الفراغات 2D']
    if (pkg.revisions === 2) features.push('تعديلان مجانيان')
    else features.push(`${pkg.revisions} تعديلات مجانية`)
    features.push('محادثة')
    if (pkg.price >= 2000) features.push('استشارة مباشرة')
    return features
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900">
      <Header />

      {/* ===== Hero Section - Enhanced Architectural Style ===== */}
      <section id="home" className="relative min-h-[70vh] md:min-h-[80vh] lg:min-h-[90vh] flex items-center bg-gradient-to-b from-cream via-cream to-greige/20 dark:from-charcoal-900 dark:via-charcoal-900 dark:to-charcoal-800 overflow-hidden">
        {/* Blueprint Grid Pattern - Very Subtle */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.01] dark:opacity-[0.005]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="hero-grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#57646C" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#hero-grid)" />
          </svg>
        </div>
        
        {/* Architectural Decorative Elements - Moved to edges */}
        <div className="absolute top-10 left-5 opacity-5 dark:opacity-3">
          <Compass className="w-24 h-24 text-rocky-blue transform -rotate-12" />
        </div>
        <div className="absolute top-20 right-5 opacity-5 dark:opacity-3">
          <PenTool className="w-20 h-20 text-blue-gray transform rotate-12" />
        </div>
        
        {/* Geometric shapes - Reduced opacity */}
        <div className="absolute top-60 right-10 w-12 h-12 border-2 border-rocky-blue/10 dark:border-rocky-blue-500/10 rotate-45 opacity-5" />
        <div className="absolute bottom-60 left-10 w-10 h-10 border-2 border-blue-gray/10 dark:border-blue-gray-500/10 rotate-45 opacity-5" />

        <div className="container mx-auto px-4 py-12 md:py-16 lg:py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center">
            {/* Hero Text - Enhanced */}
            <div className="text-right fade-in-up relative">
              {/* Architectural decoration lines */}
              <div className="absolute -right-4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-rocky-blue/20 to-transparent opacity-50" />
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-charcoal dark:text-cream mb-4 sm:mb-6 leading-tight relative max-w-2xl break-words">
                {homepageContent?.hero?.title ? (
                  <span className="relative block text-right">{homepageContent.hero.title}</span>
                ) : (
                  <span className="relative block text-right">
                    حوّل احتياجاتك إلى مخطط معماري{' '}
                    <span className="highlight text-rocky-blue dark:text-rocky-blue-300 relative">
                      مدروس
                      <span className="absolute bottom-0 right-0 left-0 h-1 bg-gradient-to-r from-rocky-blue/30 to-transparent" />
                    </span>
                  </span>
                )}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-blue-gray dark:text-greige mb-6 sm:mb-8 max-w-xl leading-relaxed">
                {homepageContent?.hero?.subtitle ?? 'تصميم تخطيطي مبدئي مخصص حسب أرضك واحتياجاتك. نساعدك على اتخاذ قرارات صحيحة منذ البداية.'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {session?.user ? (
                  <>
                    <Link href={session.user.role === 'ADMIN' ? '/admin/dashboard' : session.user.role === 'ENGINEER' ? '/engineer/dashboard' : '/dashboard'}>
                      <button className="btn-3d px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-bold rounded-none w-full sm:w-auto">
                        لوحة التحكم
                        <ArrowLeft className="w-5 h-5 inline-block ms-2" />
                      </button>
                    </Link>
                    <Link href="#packages">
                      <Button variant="outline" size="lg" className="border-2 border-rocky-blue text-rocky-blue hover:bg-rocky-blue hover:text-cream">
                        عرض الباقات
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="#packages">
                      <button className="btn-3d px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-bold rounded-none w-full sm:w-auto">
                        ابدأ تصميمك الآن
                        <ArrowLeft className="w-5 h-5 inline-block ms-2" />
                      </button>
                    </Link>
                    <Link href="#process">
                      <Button variant="outline" size="lg" className="border-2 border-rocky-blue text-rocky-blue dark:text-rocky-blue-300 dark:border-rocky-blue-400 hover:bg-rocky-blue hover:text-cream">
                        كيف نعمل؟
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Hero Visual - Before/After Comparison */}
            <div className="relative fade-in" style={{ animationDelay: '0.2s' }}>
              {/* Enhanced Before/After Comparison */}
              <div className="relative">
                {/* Decorative connector */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
                  <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 p-1 rounded-full shadow-xl">
                    <div className="bg-charcoal-800 dark:bg-charcoal-900 rounded-full p-4">
                      <ArrowLeft className="w-8 h-8 text-cream ltr:rotate-180" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-charcoal-800 to-charcoal-900 dark:from-charcoal-900 dark:to-black rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border-2 border-rocky-blue/20 dark:border-rocky-blue-400/20">
                  {/* Title */}
                  <div className="text-center mb-8">
                    <h3 className="text-3xl font-black text-cream mb-2">المقارنة البصرية</h3>
                    <p className="text-greige">الفرق بين العشوائية والاحترافية</p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    
                    {/* Before - Chaos & Wasted Space */}
                    <div className="group relative">
                      {/* Badge */}
                      <div className="absolute -top-4 right-4 z-20">
                        <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-2 rounded-full shadow-lg border-2 border-red-400">
                          <span className="text-lg font-black text-white">قبل</span>
                        </div>
                      </div>
                      
                      <div className="relative bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/40 rounded-2xl p-4 sm:p-6 md:p-8 h-64 sm:h-72 md:h-80 border-4 border-red-400 dark:border-red-700 overflow-hidden group-hover:border-red-500 dark:group-hover:border-red-600 transition-all duration-500 shadow-lg group-hover:shadow-2xl group-hover:scale-[1.02]">
                        {/* SVG Blueprint - Chaotic Layout */}
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Grid background - chaotic */}
                          <defs>
                            <pattern id="chaos-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#FEE2E2" strokeWidth="0.5" />
                            </pattern>
                          </defs>
                          <rect width="200" height="200" fill="url(#chaos-grid)" opacity="0.6" />
                          
                          {/* Chaotic room layout */}
                          <rect x="20" y="20" width="160" height="160" fill="none" stroke="#DC2626" strokeWidth="2" strokeDasharray="5,5" />
                          
                          {/* Random walls - poor distribution */}
                          <line x1="80" y1="20" x2="80" y2="100" stroke="#DC2626" strokeWidth="2" strokeDasharray="3,3" />
                          <line x1="20" y1="90" x2="120" y2="90" stroke="#DC2626" strokeWidth="2" strokeDasharray="3,3" />
                          <line x1="140" y1="20" x2="140" y2="130" stroke="#DC2626" strokeWidth="2" strokeDasharray="3,3" />
                          
                          {/* Overlapping furniture - chaos */}
                          <rect x="30" y="30" width="40" height="50" fill="#FCA5A5" fillOpacity="0.3" stroke="#DC2626" strokeWidth="1.5" />
                          <rect x="50" y="50" width="35" height="45" fill="#FCA5A5" fillOpacity="0.3" stroke="#DC2626" strokeWidth="1.5" />
                          <rect x="90" y="30" width="30" height="40" fill="#FCA5A5" fillOpacity="0.3" stroke="#DC2626" strokeWidth="1.5" />
                          <rect x="110" y="100" width="50" height="30" fill="#FCA5A5" fillOpacity="0.3" stroke="#DC2626" strokeWidth="1.5" />
                          
                          {/* Wasted spaces with X marks */}
                          <g opacity="0.7">
                            <line x1="25" y1="140" x2="45" y2="160" stroke="#DC2626" strokeWidth="3" />
                            <line x1="45" y1="140" x2="25" y2="160" stroke="#DC2626" strokeWidth="3" />
                            <text x="35" y="155" fontSize="12" fontWeight="bold" fill="#DC2626" textAnchor="middle">X</text>
                          </g>
                          
                          <g opacity="0.7">
                            <line x1="145" y1="140" x2="165" y2="160" stroke="#DC2626" strokeWidth="3" />
                            <line x1="165" y1="140" x2="145" y2="160" stroke="#DC2626" strokeWidth="3" />
                            <text x="155" y="155" fontSize="12" fontWeight="bold" fill="#DC2626" textAnchor="middle">X</text>
                          </g>
                          
                          <g opacity="0.7">
                            <line x1="85" y1="105" x2="105" y2="125" stroke="#DC2626" strokeWidth="3" />
                            <line x1="105" y1="105" x2="85" y2="125" stroke="#DC2626" strokeWidth="3" />
                            <text x="95" y="120" fontSize="12" fontWeight="bold" fill="#DC2626" textAnchor="middle">X</text>
                          </g>
                          
                          {/* Scattered diagonal lines - chaos */}
                          <line x1="20" y1="20" x2="60" y2="80" stroke="#DC2626" strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />
                          <line x1="100" y1="30" x2="140" y2="90" stroke="#DC2626" strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />
                          <line x1="150" y1="100" x2="180" y2="150" stroke="#DC2626" strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />
                        </svg>
                        
                        {/* Overlay effects */}
                        <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent pointer-events-none" />
                        
                        {/* Warning badge */}
                        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md animate-pulse flex items-center gap-1">
                          <span className="text-xs">⚠</span>
                          <span>غير مناسب</span>
                        </div>
                        
                        {/* Label */}
                        <div className="absolute bottom-6 left-0 right-0 text-center">
                          <div className="bg-gradient-to-r from-red-600 to-red-500 text-white font-black text-lg px-6 py-3 rounded-xl shadow-xl mx-auto inline-block border-2 border-red-400">
                            فوضى وضياع مساحات
                          </div>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                        <div className="bg-red-100 dark:bg-red-950/30 px-3 py-2 rounded-lg">
                          <div className="text-xl font-black text-red-600">40%</div>
                          <div className="text-xs text-red-600">مساحة مهدورة</div>
                        </div>
                        <div className="bg-red-100 dark:bg-red-950/30 px-3 py-2 rounded-lg">
                          <div className="text-xl font-black text-red-600">0/10</div>
                          <div className="text-xs text-red-600">كفاءة التوزيع</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* After - Professional Layout */}
                    <div className="group relative">
                      {/* Badge */}
                      <div className="absolute -top-4 right-4 z-20">
                        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-2 rounded-full shadow-lg border-2 border-emerald-400 animate-pulse flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-white" />
                          <span className="text-lg font-black text-white">بعد</span>
                        </div>
                      </div>
                      
                      <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-2xl p-4 sm:p-6 md:p-8 h-64 sm:h-72 md:h-80 border-4 border-emerald-400 dark:border-emerald-700 overflow-hidden group-hover:border-emerald-500 dark:group-hover:border-emerald-600 transition-all duration-500 shadow-lg group-hover:shadow-2xl group-hover:scale-[1.05]">
                        {/* SVG Blueprint - Professional Layout */}
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Grid background - organized */}
                          <defs>
                            <pattern id="pro-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#D1FAE5" strokeWidth="0.5" />
                            </pattern>
                          </defs>
                          <rect width="200" height="200" fill="url(#pro-grid)" opacity="0.6" />
                          
                          {/* Professional room layout */}
                          <rect x="20" y="20" width="160" height="160" fill="none" stroke="#10B981" strokeWidth="2.5" />
                          
                          {/* Organized walls */}
                          <line x1="100" y1="20" x2="100" y2="180" stroke="#10B981" strokeWidth="2" />
                          <line x1="20" y1="100" x2="180" y2="100" stroke="#10B981" strokeWidth="2" />
                          
                          {/* Doors */}
                          <line x1="90" y1="20" x2="110" y2="20" stroke="#FFFFFF" strokeWidth="3" />
                          <path d="M 90 20 Q 100 25 110 20" fill="none" stroke="#059669" strokeWidth="1.2" />
                          
                          <line x1="90" y1="100" x2="110" y2="100" stroke="#FFFFFF" strokeWidth="3" />
                          <path d="M 90 100 Q 100 105 110 100" fill="none" stroke="#059669" strokeWidth="1.2" />
                          
                          {/* Organized furniture */}
                          <rect x="30" y="30" width="50" height="60" fill="#A7F3D0" fillOpacity="0.4" stroke="#059669" strokeWidth="1.5" />
                          <text x="55" y="63" fontSize="8" textAnchor="middle" fill="#047857">غرفة نوم</text>
                          
                          <rect x="110" y="30" width="60" height="60" fill="#A7F3D0" fillOpacity="0.4" stroke="#059669" strokeWidth="1.5" />
                          <text x="140" y="63" fontSize="8" textAnchor="middle" fill="#047857">مجلس</text>
                          
                          <rect x="30" y="110" width="60" height="60" fill="#A7F3D0" fillOpacity="0.4" stroke="#059669" strokeWidth="1.5" />
                          <text x="60" y="143" fontSize="8" textAnchor="middle" fill="#047857">مطبخ</text>
                          
                          <rect x="110" y="110" width="60" height="60" fill="#A7F3D0" fillOpacity="0.4" stroke="#059669" strokeWidth="1.5" />
                          <text x="140" y="143" fontSize="8" textAnchor="middle" fill="#047857">حمام</text>
                          
                          {/* Flow arrows - organized movement */}
                          <g stroke="#059669" strokeWidth="1.5" fill="#059669" opacity="0.6">
                            <line x1="100" y1="30" x2="100" y2="50" markerEnd="url(#arrowhead)" />
                            <line x1="100" y1="110" x2="100" y2="130" markerEnd="url(#arrowhead)" />
                            <line x1="30" y1="100" x2="50" y2="100" markerEnd="url(#arrowhead)" />
                          </g>
                          
                          <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
                              <polygon points="0 0, 6 3, 0 6" fill="#059669" />
                            </marker>
                          </defs>
                          
                          {/* Checkmarks */}
                          <g opacity="0.8">
                            <circle cx="170" cy="30" r="8" fill="#10B981" />
                            <path d="M 166 30 L 169 33 L 174 27" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </g>
                          
                          <g opacity="0.8">
                            <circle cx="30" cy="170" r="8" fill="#10B981" />
                            <path d="M 26 170 L 29 173 L 34 167" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </g>
                        </svg>
                        
                        {/* Overlay effects */}
                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/20 to-transparent pointer-events-none" />
                        
                        {/* Success badges */}
                        <div className="absolute top-4 left-4 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                          ✨ ممتاز
                        </div>
                        
                        <div className="absolute top-4 right-4 bg-emerald-600 text-white p-2 rounded-full shadow-md group-hover:rotate-12 transition-transform duration-300">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        
                        {/* Label */}
                        <div className="absolute bottom-6 left-0 right-0 text-center">
                          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black text-lg px-6 py-3 rounded-xl shadow-xl mx-auto inline-block border-2 border-emerald-400">
                            توزيع وظيفي مدروس
                          </div>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                        <div className="bg-emerald-100 dark:bg-emerald-950/30 px-3 py-2 rounded-lg">
                          <div className="text-xl font-black text-emerald-600">95%</div>
                          <div className="text-xs text-emerald-600">كفاءة المساحة</div>
                        </div>
                        <div className="bg-emerald-100 dark:bg-emerald-950/30 px-3 py-2 rounded-lg">
                          <div className="text-xl font-black text-emerald-600">10/10</div>
                          <div className="text-xs text-emerald-600">جودة التصميم</div>
                        </div>
                      </div>
                    </div>
                    
                  </div>
                  
                  {/* Bottom summary */}
                  <div className="mt-8 bg-gradient-to-r from-rocky-blue/20 to-emerald-500/20 rounded-xl p-6 border-2 border-rocky-blue/30">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <div className="text-center">
                        <div className="text-red-500 text-2xl font-black mb-1">-40%</div>
                        <div className="text-xs text-cream">مساحة مهدورة قبل</div>
                      </div>
                      <div className="text-4xl text-cream rtl:scale-x-[-1]">→</div>
                      <div className="text-center">
                        <div className="text-emerald-500 text-2xl font-black mb-1">+95%</div>
                        <div className="text-xs text-cream">كفاءة بعد التصميم</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" className="w-full">
            <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" 
              className="fill-greige/50 dark:fill-charcoal-800"/>
          </svg>
        </div>
      </section>

      {/* ===== Problem & Solution Section - Enhanced ===== */}
      <section id="about" className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-greige/20 via-greige/30 to-cream dark:from-charcoal-800 dark:via-charcoal-800 dark:to-charcoal-900 relative">
        {/* Architectural decorative lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rocky-blue/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-gray/20 to-transparent" />
        
        <div className="container mx-auto px-4 relative z-10">
          <header className="text-center mb-8 md:mb-12 lg:mb-16 relative">
            {/* Architectural frame decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-rocky-blue/10 dark:border-rocky-blue-500/10 rotate-45 opacity-30" />
            
            <h2 className="text-3xl md:text-4xl font-black text-charcoal dark:text-cream mb-4 relative z-10">
              لماذا تبدأ البناء بدون مخطط مدروس؟
            </h2>
            <p className="text-blue-gray dark:text-greige max-w-2xl mx-auto relative z-10">
              المشاكل الشائعة التي يواجهها معظم الناس عند البناء بدون تخطيط سليم
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-8 md:mb-12">
            {/* Problem Cards - ترتيب من اليمين: قرارات متسرعة، مساحات مهدورة، توزيع غير مناسب */}
            {[
              { Icon: HastyDecisionsIcon, title: 'قرارات متسرعة', desc: 'قرارات بناء سريعة دون دراسة كافية', color: 'from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30' },
              { Icon: WastedSpacesIcon, title: 'مساحات مهدورة', desc: 'غرف وزوايا غير مستغلة بشكل صحيح', color: 'from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30' },
              { Icon: UnsuitableLayoutIcon, title: 'توزيع غير مناسب', desc: 'تصميم لا يناسب نمط حياة العائلة', color: 'from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30' }
            ].map((problem, idx) => {
              const ProblemIcon = problem.Icon
              return (
                <div key={idx} className="card-3d p-4 sm:p-6 md:p-8 text-center fade-in group hover:shadow-hard-lg transition-all duration-300" style={{ animationDelay: `${idx * 0.1}s` }}>
                  {/* إطار الأيقونة مع خلفية متدرجة */}
                  <div className={`relative w-32 h-32 mx-auto mb-6 bg-gradient-to-br ${problem.color} rounded-none border-2 border-rocky-blue/30 dark:border-rocky-blue-400/40 shadow-sm group-hover:shadow-md group-hover:border-rocky-blue/50 dark:group-hover:border-rocky-blue-400/60 transition-all duration-300 overflow-hidden`}>
                    {/* زخرفة الزوايا */}
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-rocky-blue/40 dark:border-rocky-blue-400/50" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-rocky-blue/40 dark:border-rocky-blue-400/50" />
                    {/* الأيقونة */}
                    <div className="absolute inset-0 flex items-center justify-center p-4 group-hover:scale-105 transition-transform duration-300">
                      <ProblemIcon className="w-full h-full" />
                    </div>
                  </div>
                  
                  {/* العنوان */}
                  <h3 className="text-2xl font-black text-charcoal dark:text-cream mb-3 leading-tight group-hover:text-rocky-blue dark:group-hover:text-rocky-blue-300 transition-colors duration-300">
                    {problem.title}
                  </h3>
                  
                  {/* الوصف */}
                  <p className="text-base leading-relaxed text-blue-gray dark:text-greige">
                    {problem.desc}
                  </p>
                  
                  {/* خط سفلي زخرفي */}
                  <div className="mt-6 pt-4 border-t border-greige/30 dark:border-charcoal-600">
                    <div className="w-12 h-1 bg-rocky-blue/30 dark:bg-rocky-blue-500/30 mx-auto rounded-full group-hover:w-20 group-hover:bg-rocky-blue/60 dark:group-hover:bg-rocky-blue-400/60 transition-all duration-300" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Solution Highlight - Enhanced */}
          <div className="relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-emerald-400/20 to-transparent rounded-full blur-3xl" />
            
            <div className="relative bg-gradient-to-br from-rocky-blue via-rocky-blue-600 to-rocky-blue-700 dark:from-rocky-blue-600 dark:via-rocky-blue-700 dark:to-rocky-blue-800 rounded-2xl p-10 shadow-2xl border-2 border-rocky-blue-400/30 dark:border-rocky-blue-300/30">
              {/* Blueprint grid pattern */}
              <div className="absolute inset-0 opacity-5">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <pattern id="solution-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100" height="100" fill="url(#solution-grid)" />
                </svg>
              </div>
              
              <div className="relative z-10">
                {/* Icon with animated glow */}
                <div className="relative w-28 h-28 mx-auto mb-6 group">
                  {/* Multiple glow layers for depth */}
                  <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-2xl opacity-60 animate-pulse" />
                  <div className="absolute inset-0 bg-yellow-300/20 rounded-full blur-3xl opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute inset-0 bg-white/10 rounded-full blur-xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
                  
                  {/* Icon container with enhanced effects */}
                  <div className="relative bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm rounded-full p-6 shadow-2xl border-2 border-white/30 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    {/* Inner glow */}
                    <div className="absolute inset-2 bg-gradient-to-br from-yellow-300/20 to-transparent rounded-full" />
                    
                    {/* Main icon */}
                    <Lightbulb className="relative w-full h-full text-yellow-100 drop-shadow-[0_0_15px_rgba(253,224,71,0.5)] group-hover:text-yellow-50 transition-all duration-300" strokeWidth={2.5} />
                    
                    {/* Sparkle effects */}
                    <div className="absolute -top-1 -right-1 w-3 h-3">
                      <Zap className="w-full h-full text-yellow-300 animate-pulse opacity-70" fill="currentColor" />
                    </div>
                    <div className="absolute -bottom-1 -left-1 w-2 h-2">
                      <Zap className="w-full h-full text-yellow-400 animate-pulse opacity-60" fill="currentColor" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                  
                  {/* Rotating ring effect */}
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-yellow-300/20 animate-spin" style={{ animationDuration: '20s' }} />
                </div>
                
                {/* Badge - Architectural Style */}
                <div className="relative inline-block bg-cream/20 dark:bg-charcoal-800/50 text-cream px-6 py-2 rounded-none text-sm font-black mb-4 shadow-lg border-2 border-cream/40 dark:border-charcoal-700">
                  {/* Architectural corner decorations */}
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cream/60 dark:border-charcoal-600" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cream/60 dark:border-charcoal-600" />
                  <span className="relative z-10">الحل الأمثل</span>
                </div>
                
                {/* Title */}
                <h3 className="text-3xl md:text-4xl font-black text-cream mb-4 leading-tight">
                  تصميم معماري مدروس
                  <br />
                  <span className="text-cream/90 dark:text-cream">قبل البناء</span>
                </h3>
                
                {/* Description */}
                <p className="text-xl text-cream/90 mb-8 max-w-2xl mx-auto leading-relaxed">
                  نساعدك على اتخاذ قرارات صحيحة منذ البداية لتوفير الوقت والمال
                </p>
                
                {/* Benefits grid - Architectural Style */}
                <div className="grid md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
                  {[
                    { icon: Clock, title: 'توفير الوقت' },
                    { icon: Target, title: 'توفير التكاليف' },
                    { icon: CheckCircle, title: 'ضمان الجودة' }
                  ].map((benefit, idx) => {
                    const IconComponent = benefit.icon
                    return (
                      <div key={idx} className="group relative bg-white/10 dark:bg-charcoal-800/30 backdrop-blur-sm rounded-none p-5 border-2 border-white/20 dark:border-charcoal-700/50 hover:border-cream/40 dark:hover:border-charcoal-600 transition-all duration-300 hover:shadow-lg">
                        {/* Architectural corner decorations */}
                        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cream/40 dark:border-cream/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cream/40 dark:border-cream/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <IconComponent className="w-10 h-10 mb-2 text-cream relative z-10" />
                        <div className="text-cream font-black text-base relative z-10">{benefit.title}</div>
                      </div>
                    )
                  })}
                </div>
                
                {/* CTA Button */}
                <Link href="#packages">
                  <button className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-cream to-greige/30 hover:from-greige/30 hover:to-cream text-rocky-blue dark:text-charcoal-900 px-10 py-5 rounded-xl font-black text-xl shadow-2xl hover:shadow-cream/30 dark:hover:shadow-charcoal-800/50 transition-all duration-300 hover:scale-105">
                    <span>ابدأ الآن</span>
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </button>
                </Link>
                
                {/* Bottom decoration */}
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cream/60 dark:bg-rocky-blue-400 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-cream/60 dark:bg-rocky-blue-400 animate-pulse delay-100" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 rounded-full bg-cream/60 dark:bg-rocky-blue-400 animate-pulse delay-200" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Benefits Section - Enhanced ===== */}
      <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-cream via-greige/20 to-greige/30 dark:from-charcoal-900 dark:via-charcoal-800 dark:to-charcoal-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-rocky-blue/5 dark:bg-rocky-blue/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-gray/5 dark:bg-blue-gray/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <header className="text-center mb-8 md:mb-12 lg:mb-16">
            {/* Badge - Architectural Style */}
            <div className="relative inline-block bg-rocky-blue dark:bg-rocky-blue-600 text-cream px-6 py-2 rounded-none text-sm font-black mb-4 shadow-lg border-2 border-rocky-blue-400/30 dark:border-rocky-blue-400/40 flex items-center gap-2">
              {/* Architectural corner decorations */}
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cream/50 dark:border-cream/40" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cream/50 dark:border-cream/40" />
              <Target className="w-4 h-4 relative z-10" />
              <span className="relative z-10">المميزات</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black text-charcoal dark:text-cream mb-4">
              ماذا ستحصل عليه؟
            </h2>
            <p className="text-xl text-blue-gray dark:text-greige max-w-2xl mx-auto">
              خدمات هندسية شاملة لضمان نجاح مشروعك
            </p>
          </header>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 max-w-7xl mx-auto">
            {[
              { 
                icon: Compass, 
                title: 'تحليل احتياجاتك', 
                desc: 'نفهم نمط حياتك وعائلتك',
                color: 'from-rocky-blue/30 to-rocky-blue/20',
                bgColor: 'from-rocky-blue/10 to-rocky-blue/5 dark:from-rocky-blue/20 dark:to-rocky-blue/10'
              },
              { 
                icon: Layers, 
                title: 'توزيع فراغات ذكي', 
                desc: 'كل متر مربع له وظيفة واضحة',
                color: 'from-blue-gray/30 to-blue-gray/20',
                bgColor: 'from-blue-gray/10 to-blue-gray/5 dark:from-blue-gray/20 dark:to-blue-gray/10'
              },
              { 
                icon: FileText, 
                title: 'تصور تخطيطي واضح', 
                desc: 'مخططات مفصلة قابلة للتنفيذ',
                color: 'from-greige/30 to-greige/20',
                bgColor: 'from-greige/10 to-greige/5 dark:from-greige/20 dark:to-greige/10'
              },
              { 
                icon: Shield, 
                title: 'إشراف هندسي دقيق', 
                desc: 'ضمان مطابقة التنفيذ للمخططات',
                color: 'from-rocky-blue/30 to-blue-gray/20',
                bgColor: 'from-rocky-blue/10 to-blue-gray/5 dark:from-rocky-blue/20 dark:to-blue-gray/10'
              }
            ].map((benefit, idx) => (
              <div 
                key={idx} 
                className="group relative fade-in" 
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Card */}
                <div className="relative h-full bg-white dark:bg-charcoal-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-400/30 group-hover:-translate-y-2">
                  {/* Icon container with gradient */}
                  <div className="relative mb-6">
                    {/* Glow effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500`} />
                    
                    {/* Icon wrapper */}
                    <div className={`relative w-20 h-20 bg-gradient-to-br ${benefit.bgColor} rounded-2xl flex items-center justify-center border-2 border-rocky-blue/20 dark:border-rocky-blue-400/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-10 rounded-2xl`} />
                      <benefit.icon className="relative w-10 h-10 text-rocky-blue dark:text-rocky-blue-300 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    
                    {/* Number badge */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-rocky-blue to-rocky-blue-600 text-cream rounded-full flex items-center justify-center text-sm font-black shadow-lg">
                      {idx + 1}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-black text-charcoal dark:text-cream mb-3 leading-tight group-hover:text-rocky-blue dark:group-hover:text-rocky-blue-300 transition-colors duration-300">
                    {benefit.title}
                  </h3>
                  <p className="text-blue-gray dark:text-greige leading-relaxed">
                    {benefit.desc}
                  </p>
                  
                  {/* Bottom decoration */}
                  <div className="mt-6 pt-4 border-t border-greige/30 dark:border-charcoal-600">
                    <div className={`h-1 bg-gradient-to-r ${benefit.color} rounded-full w-0 group-hover:w-full transition-all duration-500`} />
                  </div>
                </div>
                
                {/* Decorative corner */}
                <div className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-rocky-blue/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2 border-rocky-blue/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
          
          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <p className="text-lg text-blue-gray dark:text-greige mb-6">
              جاهز لتحويل فكرتك إلى تصميم احترافي؟
            </p>
            <Link href="#packages">
              <button className="inline-flex items-center gap-3 bg-gradient-to-r from-rocky-blue to-rocky-blue-600 hover:from-rocky-blue-600 hover:to-rocky-blue-700 text-cream px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                <span>استكشف الباقات</span>
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Process Section - Enhanced ===== */}
      <section id="process" className="py-10 sm:py-12 md:py-16 lg:py-20 bg-gradient-to-b from-greige/30 via-greige/20 to-blue-gray/10 dark:from-charcoal-800 dark:via-charcoal-800 dark:to-charcoal-900 relative overflow-visible">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-rocky-blue/5 dark:bg-rocky-blue/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-gray/5 dark:bg-blue-gray/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <header className="text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16">
            {/* Badge - Architectural Style */}
            <div className="relative inline-block bg-rocky-blue dark:bg-rocky-blue-600 text-cream px-6 py-2 rounded-none text-sm font-black mb-4 shadow-lg border-2 border-rocky-blue-400/30 dark:border-rocky-blue-400/40 flex items-center gap-2">
              {/* Architectural corner decorations */}
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cream/50 dark:border-cream/40" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cream/50 dark:border-cream/40" />
              <FileText className="w-4 h-4 relative z-10" />
              <span className="relative z-10">العملية</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-charcoal dark:text-cream mb-3 sm:mb-4 px-1">
              التفكير بطريقة هندسية لمشروعك
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-blue-gray dark:text-greige max-w-2xl mx-auto px-1">
              رحلة من الفكرة إلى التصميم في 5 خطوات احترافية
            </p>
          </header>

          <div className="max-w-5xl mx-auto relative">
            {/* Enhanced Vertical Line with dots - desktop only */}
            <div className="absolute right-12 top-0 bottom-0 w-1 bg-gradient-to-b from-rocky-blue via-rocky-blue/50 to-rocky-blue hidden md:block" aria-hidden>
              {processSteps.map((_, idx) => (
                <div
                  key={idx}
                  className="absolute right-1/2 translate-x-1/2 w-6 h-6 bg-rocky-blue rounded-full border-4 border-cream dark:border-charcoal-900 shadow-lg"
                  style={{ top: `${(idx * 20) + 10}%` }}
                />
              ))}
            </div>

            {processSteps.map((step, idx) => {
              const isLast = idx === processSteps.length - 1
              return (
                <div key={idx} className="relative flex flex-col sm:flex-row gap-4 sm:gap-8 mb-6 sm:mb-10 fade-in group min-h-0" style={{ animationDelay: `${idx * 0.1}s` }}>
                  {/* Step Number - smaller on mobile */}
                  <div className="relative flex-shrink-0 z-20 flex flex-row sm:flex-col items-center gap-3 sm:gap-0">
                    <div className="absolute inset-0 bg-rocky-blue rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300 hidden sm:block" />
                    <div className="relative w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-rocky-blue to-rocky-blue-600 dark:from-rocky-blue-600 dark:to-rocky-blue-700 text-cream rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-2xl shadow-xl border-2 sm:border-4 border-cream dark:border-charcoal-900 group-hover:scale-110 transition-transform duration-300">
                      {step.number}
                    </div>
                    {!isLast && (
                      <div className="absolute top-14 sm:top-20 right-1/2 translate-x-1/2 w-0.5 h-4 sm:h-10 bg-gradient-to-b from-rocky-blue/50 to-transparent hidden md:block" />
                    )}
                  </div>
                  
                  {/* Step Content - على الجوال: أيقونة في صف مستقل ثم النص بدون تداخل */}
                  <div className="flex-1 min-w-0 group-hover:translate-x-2 transition-transform duration-300">
                    <div className="relative bg-white dark:bg-charcoal-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-500/30 overflow-visible">
                      {/* أيقونة: على الجوال صف كامل مع مسافة تحت؛ من sm فما فوق في الزاوية */}
                      <div className="flex justify-center sm:justify-start sm:absolute sm:top-6 sm:left-6 w-full sm:w-16 sm:h-16 mb-4 sm:mb-0 sm:flex items-center justify-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-rocky-blue/10 dark:bg-rocky-blue/20 rounded-xl flex items-center justify-center border-2 border-rocky-blue/20 flex-shrink-0">
                          <step.icon className="w-6 h-6 sm:w-8 sm:h-8 text-rocky-blue dark:text-rocky-blue-300" />
                        </div>
                      </div>
                      
                      {/* النص: على الجوال يبدأ تحت الأيقونة بمسافة واضحة؛ على الديسكتوب مع مساحة لليسار */}
                      <div className="pr-0 sm:pr-24 min-w-0 pt-0 sm:pt-0">
                        <h3 className="text-lg sm:text-xl md:text-2xl font-black text-charcoal dark:text-cream mb-2 sm:mb-3 group-hover:text-rocky-blue dark:group-hover:text-rocky-blue-300 transition-colors duration-300">
                          {step.title}
                        </h3>
                        <p className="text-sm sm:text-base leading-relaxed text-blue-gray dark:text-greige break-words">
                          {step.description}
                        </p>
                      </div>
                      
                      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-greige/30 dark:border-charcoal-600">
                        <div className="w-0 h-1 bg-gradient-to-r from-rocky-blue to-transparent rounded-full group-hover:w-full transition-all duration-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== Packages Section - Enhanced ===== */}
      <section id="packages" className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-blue-gray/10 via-greige/20 to-rocky-blue/10 dark:from-charcoal-900 dark:via-charcoal-800 dark:to-charcoal-900 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 right-0 w-64 h-64 bg-rocky-blue/5 dark:bg-rocky-blue/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-64 h-64 bg-blue-gray/5 dark:bg-blue-gray/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <header className="text-center mb-8 md:mb-12 lg:mb-16">
            {/* Badge - Architectural Style */}
            <div className="relative inline-block bg-rocky-blue dark:bg-rocky-blue-600 text-cream px-6 py-2 rounded-none text-sm font-black mb-4 shadow-lg border-2 border-rocky-blue-400/30 dark:border-rocky-blue-400/40 flex items-center gap-2">
              {/* Architectural corner decorations */}
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cream/50 dark:border-cream/40" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cream/50 dark:border-cream/40" />
              <Layers className="w-4 h-4 relative z-10" />
              <span className="relative z-10">الباقات</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black text-charcoal dark:text-cream mb-4">
              باقات الخدمة
            </h2>
            <p className="text-xl text-blue-gray dark:text-greige max-w-2xl mx-auto">
              اختر الباقة المناسبة لاحتياجاتك وميزانيتك
            </p>
          </header>

          {loadingPackages ? (
            <div className="space-y-6">
              <p className="text-center text-blue-gray dark:text-greige">جاري تحميل الباقات...</p>
              <div className="grid md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-8 border-2 border-greige/30 dark:border-charcoal-600 bg-white dark:bg-charcoal-800 animate-pulse"
                    aria-hidden
                  >
                    <div className="h-12 w-12 rounded-lg bg-greige/40 dark:bg-charcoal-600 mb-6" />
                    <div className="h-6 w-3/4 bg-greige/40 dark:bg-charcoal-600 rounded mb-4" />
                    <div className="h-4 w-full bg-greige/30 dark:bg-charcoal-600 rounded mb-2" />
                    <div className="h-4 w-5/6 bg-greige/30 dark:bg-charcoal-600 rounded mb-6" />
                    <div className="h-10 w-full bg-greige/40 dark:bg-charcoal-600 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-blue-gray dark:text-greige">لا توجد باقات متاحة حالياً</p>
            </div>
          ) : (
            <div
              className={`grid gap-8 ${
                packages.length === 1
                  ? 'grid-cols-1 max-w-md mx-auto'
                  : packages.length === 2
                    ? 'md:grid-cols-2 max-w-4xl mx-auto'
                    : 'md:grid-cols-3'
              }`}
            >
              {packages.map((pkg, idx) => {
                const features = getPackageFeatures(pkg)
                const isPopular = packages.length >= 2 && idx === 1
                
                // Package icons based on type
                const getPackageIcon = () => {
                  if (pkg.price <= 500) return Layers // Basic
                  if (pkg.price <= 1000) return Target // Standard
                  return Shield // Premium
                }
                
                const PackageIcon = getPackageIcon()
                
                // Package tagline
                const getTagline = () => {
                  if (pkg.price <= 500) return 'للبدء السريع'
                  if (pkg.price <= 1000) return 'الأكثر طلباً'
                  return 'الحل الشامل'
                }
                
                // Package description
                const getDescription = () => {
                  if (pkg.price <= 500) return 'باقة أساسية للتصميم السريع والمباشر'
                  if (pkg.price <= 1000) return 'باقة متوسطة مع ميزات إضافية'
                  return 'باقة شاملة مع جميع الخدمات المتقدمة'
                }
                
                return (
                  <div 
                    key={pkg.id} 
                    className={`package-card relative bg-white dark:bg-charcoal-800 border-2 rounded-2xl p-8 flex flex-col transition-all duration-500 group hover:shadow-2xl hover:-translate-y-2 ${
                      isPopular 
                        ? 'popular border-rocky-blue dark:border-rocky-blue-600 shadow-xl dark:shadow-charcoal-900/50 scale-105' 
                        : 'border-greige/30 dark:border-charcoal-600 shadow-lg dark:shadow-medium hover:border-rocky-blue/50 dark:hover:border-rocky-blue-500/50'
                    }`}
                  >
                    {/* Popular Badge - Enhanced */}
                    {isPopular && (
                      <div className="absolute -top-4 right-6 bg-gradient-to-r from-rocky-blue to-rocky-blue-600 dark:from-rocky-blue-600 dark:to-rocky-blue-700 text-cream px-6 py-2 text-sm font-black rounded-full shadow-xl border-2 border-cream dark:border-charcoal-900 z-10 animate-pulse flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        <span>الأكثر طلباً</span>
                      </div>
                    )}
                    
                    {/* Package Icon - Enhanced */}
                    <div className="relative mb-6">
                      {/* Glow effect */}
                      <div className={`absolute inset-0 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300 ${
                        isPopular 
                          ? 'bg-rocky-blue' 
                          : 'bg-greige dark:bg-charcoal-600'
                      }`} />
                      
                      {/* Icon container */}
                      <div className={`relative package-icon w-20 h-20 flex items-center justify-center border-2 rounded-2xl transition-all duration-300 group-hover:scale-110 ${
                        isPopular 
                          ? 'bg-gradient-to-br from-rocky-blue/20 to-rocky-blue/10 dark:from-rocky-blue/30 dark:to-rocky-blue/20 border-rocky-blue/40 dark:border-rocky-blue-600' 
                          : 'bg-gradient-to-br from-greige/20 to-greige/10 dark:from-charcoal-700 dark:to-charcoal-600 border-greige/40 dark:border-charcoal-600'
                      }`}>
                        <PackageIcon className={`w-10 h-10 transition-transform duration-300 group-hover:rotate-12 ${
                          isPopular 
                            ? 'text-rocky-blue dark:text-rocky-blue-300' 
                            : 'text-charcoal dark:text-cream'
                        }`} />
                      </div>
                    </div>
                    
                    {/* Package Header - Enhanced */}
                    <div className="package-header mb-6">
                      <h3 className="text-3xl font-black text-charcoal dark:text-cream mb-2 group-hover:text-rocky-blue dark:group-hover:text-rocky-blue-300 transition-colors duration-300">
                        {pkg.nameAr}
                      </h3>
                      <div className="inline-block bg-greige/20 dark:bg-charcoal-700 px-4 py-1 rounded-full">
                        <p className="package-tagline text-sm font-bold text-blue-gray dark:text-greige">{getTagline()}</p>
                      </div>
                    </div>
                    
                    {/* Package Price - Enhanced */}
                    <div className="package-price mb-6 pb-6 border-b-2 border-greige/30 dark:border-charcoal-600">
                      <div className="flex items-baseline gap-2">
                        <span className="package-price-amount text-5xl font-black bg-gradient-to-r from-rocky-blue to-rocky-blue-600 dark:from-rocky-blue-400 dark:to-rocky-blue-500 bg-clip-text text-transparent">
                          {pkg.price}
                        </span>
                        <span className="package-price-currency text-xl font-bold text-blue-gray dark:text-greige">ريال</span>
                      </div>
                    </div>
                    
                    {/* Package Description */}
                    <p className="package-description text-sm text-blue-gray dark:text-greige mb-6">
                      {getDescription()}
                    </p>
                    
                    {/* Package Features - Enhanced */}
                    <ul className="package-features space-y-4 mb-8 flex-1">
                      {features.map((feature, fidx) => (
                        <li key={fidx} className="flex items-start gap-3 group/feature">
                          <div className="relative flex-shrink-0 mt-0.5">
                            <CheckCircle className="w-6 h-6 text-rocky-blue dark:text-rocky-blue-300 group-hover/feature:scale-125 transition-transform duration-300" />
                          </div>
                          <span className="text-base font-medium text-charcoal dark:text-cream leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* Execution Time - Architectural Style */}
                    <div className="mt-4 pt-4 border-t-2 border-greige/30 dark:border-charcoal-600">
                      <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-rocky-blue/10 to-blue-gray/10 dark:from-rocky-blue/20 dark:to-blue-gray/20 px-4 py-3 rounded-none border-2 border-rocky-blue/20 dark:border-rocky-blue-500/30">
                        <Clock className="w-5 h-5 text-rocky-blue dark:text-rocky-blue-300" />
                        <div className="text-center">
                          <div className="text-xs font-bold text-blue-gray dark:text-greige mb-1">الوقت المتوقع للتنفيذ</div>
                          <div className="text-lg font-black text-rocky-blue dark:text-rocky-blue-300">
                            {pkg.executionDays} {pkg.executionDays === 1 ? 'يوم' : 'أيام'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Package Actions - Enhanced */}
                    <div className="package-actions mt-auto">
                      <Link href={session?.user ? `/orders/select-package?package=${pkg.id}` : `/register?package=${pkg.id}`}>
                        <button className={`w-full py-4 font-black text-lg rounded-xl transition-all duration-300 hover:scale-105 ${
                          isPopular 
                            ? 'btn-3d bg-gradient-to-r from-rocky-blue to-rocky-blue-600 dark:from-rocky-blue-600 dark:to-rocky-blue-700 text-cream hover:from-rocky-blue-600 hover:to-rocky-blue-700 dark:hover:from-rocky-blue-700 dark:hover:to-rocky-blue-800 shadow-xl' 
                            : 'bg-gradient-to-r from-greige/30 to-greige/20 dark:from-charcoal-700 dark:to-charcoal-600 text-charcoal dark:text-cream hover:from-greige/50 hover:to-greige/30 dark:hover:from-charcoal-600 dark:hover:to-charcoal-500 border-2 border-greige/30 dark:border-charcoal-600 shadow-lg'
                        }`}>
                          اختر الباقة
                        </button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== FAQ Section - Enhanced ===== */}
      <section id="faq" className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-greige/30 via-blue-gray/20 to-rocky-blue/30 dark:from-charcoal-800 dark:via-charcoal-800 dark:to-charcoal-900 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rocky-blue/5 dark:bg-rocky-blue/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-gray/5 dark:bg-blue-gray/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <header className="text-center mb-8 md:mb-12 lg:mb-16">
            {/* Badge - Architectural Style */}
            <div className="relative inline-block bg-rocky-blue dark:bg-rocky-blue-600 text-cream px-6 py-2 rounded-none text-sm font-black mb-4 shadow-lg border-2 border-rocky-blue-400/30 dark:border-rocky-blue-400/40 flex items-center gap-2">
              {/* Architectural corner decorations */}
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cream/50 dark:border-cream/40" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cream/50 dark:border-cream/40" />
              <MessageCircle className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{homepageContent?.faq?.sectionTitle ?? 'الأسئلة الشائعة'}</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black text-charcoal dark:text-cream mb-4">
              {homepageContent?.faq?.sectionTitle ?? 'الأسئلة الشائعة'}
            </h2>
            <p className="text-xl text-blue-gray dark:text-greige max-w-2xl mx-auto">
              إجابات على أكثر الأسئلة التي تردنا
            </p>
          </header>

          <div className="max-w-4xl mx-auto space-y-6">
            {(homepageContent?.faq?.items?.length ? homepageContent.faq.items.map((item, i) => ({ ...item, icon: [Layers, Target, PenTool, Clock, Shield][i] ?? Layers })) : faqs).map((faq, idx) => (
              <div key={idx} className="group">
                <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-500/30 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-6 flex items-center justify-between text-right hover:bg-greige/5 dark:hover:bg-charcoal-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Icon with background */}
                      <div className="w-12 h-12 bg-rocky-blue/10 dark:bg-rocky-blue/20 rounded-xl flex items-center justify-center border-2 border-rocky-blue/20 flex-shrink-0">
                        <faq.icon className="w-6 h-6 text-rocky-blue dark:text-rocky-blue-300" />
                      </div>
                      <span className="text-lg font-black text-charcoal dark:text-cream group-hover:text-rocky-blue dark:group-hover:text-rocky-blue-300 transition-colors duration-300">
                        {faq.question}
                      </span>
                    </div>
                    <div className={`w-10 h-10 rounded-full bg-rocky-blue/10 dark:bg-rocky-blue/20 flex items-center justify-center transition-all duration-300 ${
                      openFaq === idx ? 'bg-rocky-blue dark:bg-rocky-blue-600 text-cream rotate-180' : 'text-rocky-blue dark:text-rocky-blue-300'
                    }`}>
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </button>
                  
                  <div className={`overflow-hidden transition-all duration-500 ${openFaq === idx ? 'max-h-96' : 'max-h-0'}`}>
                    <div className="px-6 pb-6 pt-0">
                      <div className="pt-4 border-t border-greige/30 dark:border-charcoal-600">
                        <p className="text-base leading-relaxed text-blue-gray dark:text-greige">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Final CTA Section - Enhanced ===== */}
      <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-rocky-blue/50 via-rocky-blue-600 to-rocky-blue-700 dark:from-rocky-blue-800 dark:via-rocky-blue-900 dark:to-charcoal-900 relative overflow-hidden">
        {/* Decorative elements - unified colors */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-rocky-blue/20 to-blue-gray/10 dark:from-rocky-blue/30 dark:to-blue-gray/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-gray/20 to-greige/10 dark:from-blue-gray/30 dark:to-greige/20 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          {/* Badge - Architectural Style */}
          <div className="relative inline-block bg-cream dark:bg-charcoal-800 text-rocky-blue dark:text-rocky-blue-300 px-6 py-2 rounded-none text-sm font-black mb-6 shadow-xl border-2 border-cream/50 dark:border-charcoal-700 flex items-center gap-2">
            {/* Architectural corner decorations */}
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-rocky-blue/40 dark:border-rocky-blue-400/40" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-rocky-blue/40 dark:border-rocky-blue-400/40" />
            <ArrowLeft className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{homepageContent?.cta?.badge ?? 'ابدأ الآن'}</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-cream mb-4">
            {homepageContent?.cta?.title ?? 'خذ قرارك بثقة'}
          </h2>
          <h3 className="text-2xl md:text-3xl text-cream/90 dark:text-cream mb-6 font-bold">
            {homepageContent?.cta?.subtitle ?? 'وابدأ بتصميم منزلك اليوم للتنفيذ غداً'}
          </h3>
          <p className="text-xl text-cream/90 max-w-3xl mx-auto mb-10 leading-relaxed whitespace-pre-line">
            {homepageContent?.cta?.paragraph ?? 'لا تبدأ البناء قبل أن تتأكد من أن المخطط مناسب لك ولعائلتك.\nدع الخبرة الهندسية تساعدك على اتخاذ القرارات الصحيحة منذ البداية.'}
          </p>
          
          <Link href="#packages">
            <button className="group relative inline-flex items-center gap-4 bg-gradient-to-r from-cream to-greige/30 hover:from-greige/30 hover:to-cream text-rocky-blue dark:text-charcoal-900 px-12 py-6 rounded-2xl font-black text-2xl shadow-2xl hover:shadow-cream/30 dark:hover:shadow-charcoal-800/50 transition-all duration-300 hover:scale-110 mb-16">
              <span>هيا بنا</span>
              <ArrowLeft className="w-7 h-7 group-hover:-translate-x-2 transition-transform duration-300" />
              
              {/* Shine effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </button>
          </Link>

          {/* Quick Features - Enhanced */}
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 max-w-4xl mx-auto">
            {(homepageContent?.cta?.features?.length ? homepageContent.cta.features.map((f, i) => ({ title: f.title, desc: f.desc, icon: [PenTool, Clock, Shield][i] ?? PenTool, color: ['from-rocky-blue/30 to-rocky-blue/20', 'from-blue-gray/30 to-blue-gray/20', 'from-greige/30 to-greige/20'][i] ?? 'from-rocky-blue/30 to-rocky-blue/20' })) : [
              { icon: PenTool, title: 'تعديلات مجانية', desc: 'حتى تصل للنتيجة المثالية', color: 'from-rocky-blue/30 to-rocky-blue/20' },
              { icon: Clock, title: 'تسليم سريع', desc: 'من 7-21 يوم', color: 'from-blue-gray/30 to-blue-gray/20' },
              { icon: Shield, title: 'جودة مضمونة', desc: 'تصاميم مدروسة ومعتمدة', color: 'from-greige/30 to-greige/20' }
            ]).map((item, idx) => (
              <div key={idx} className="group text-center">
                <div className="relative mb-6">
                  {/* Glow effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} dark:from-rocky-blue/20 dark:to-rocky-blue/10 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300`} />
                  
                  {/* Icon container */}
                  <div className="relative w-20 h-20 bg-white/10 dark:bg-charcoal-800/30 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto border-2 border-white/20 dark:border-charcoal-700/50 group-hover:scale-110 group-hover:border-white/40 dark:group-hover:border-charcoal-600 transition-all duration-300">
                    <item.icon className="w-10 h-10 text-cream dark:text-rocky-blue-300 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                </div>
                <h4 className="text-xl font-black text-cream mb-2">{item.title}</h4>
                <p className="text-base text-cream/80 dark:text-cream/70">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Footer - Enhanced with Gradient ===== */}
      <footer className="footer-dark relative py-16 bg-gradient-to-b from-rocky-blue-700 via-charcoal-900 to-charcoal-900 dark:from-charcoal-900 dark:via-black dark:to-black">
        {/* Decorative elements - unified with CTA */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-rocky-blue/10 to-blue-gray/5 dark:from-rocky-blue/20 dark:to-blue-gray/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-gray/10 to-greige/5 dark:from-blue-gray/20 dark:to-greige/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 lg:gap-12 mb-8 md:mb-12">
            {/* Brand */}
            <div>
              <h3 className="text-2xl font-black text-cream mb-4">منصة فكرة</h3>
              <p className="text-cream/70 mb-6 leading-relaxed">
                منصة هندسية معمارية متخصصة في التخطيط المعماري وربط العملاء بالمهندسين المعماريين المحترفين.
              </p>
              <div className="space-y-3">
                <a href={`mailto:${homepageContent?.footer?.email ?? 'info@fikra-platform.com'}`} className="flex items-center gap-3 text-cream/70 hover:text-cream transition-colors group">
                  <div className="w-10 h-10 bg-rocky-blue/20 dark:bg-rocky-blue/30 rounded-lg flex items-center justify-center group-hover:bg-rocky-blue/30 dark:group-hover:bg-rocky-blue/40 transition-colors">
                    <Mail className="w-5 h-5 text-rocky-blue-300" />
                  </div>
                  <span>{homepageContent?.footer?.email ?? 'info@fikra-platform.com'}</span>
                </a>
                <a href={`tel:${(homepageContent?.footer?.phone ?? '+966500000000').replace(/\s/g, '')}`} className="flex items-center gap-3 text-cream/70 hover:text-cream transition-colors group">
                  <div className="w-10 h-10 bg-blue-gray/20 dark:bg-blue-gray/30 rounded-lg flex items-center justify-center group-hover:bg-blue-gray/30 dark:group-hover:bg-blue-gray/40 transition-colors">
                    <Phone className="w-5 h-5 text-blue-gray-300" />
                  </div>
                  <span dir="ltr" className="text-left">
                    {homepageContent?.footer?.phone ?? '+966 50 000 0000'}
                  </span>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-black text-cream mb-6">روابط سريعة</h4>
              <ul className="space-y-3">
                {[
                  { href: '#home', label: 'الرئيسية' },
                  { href: '#about', label: 'عن الخدمة' },
                  { href: '#process', label: 'كيف نعمل' },
                  { href: '#packages', label: 'الباقات' },
                  { href: '#faq', label: 'الأسئلة الشائعة' }
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="flex items-center gap-2 text-cream/70 hover:text-cream transition-colors group">
                      <div className="w-1.5 h-1.5 rounded-full bg-rocky-blue/50 group-hover:bg-rocky-blue transition-colors" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-lg font-black text-cream mb-6">الدعم</h4>
              <ul className="space-y-3">
                {!session?.user && (
                  <>
                    <li>
                      <Link href="/register" className="flex items-center gap-2 text-cream/70 hover:text-cream transition-colors group">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-gray/50 group-hover:bg-blue-gray transition-colors" />
                        <span>إنشاء حساب</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/login" className="flex items-center gap-2 text-cream/70 hover:text-cream transition-colors group">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-gray/50 group-hover:bg-blue-gray transition-colors" />
                        <span>تسجيل الدخول</span>
                      </Link>
                    </li>
                  </>
                )}
                <li>
                  <Link href="#faq" className="flex items-center gap-2 text-cream/70 hover:text-cream transition-colors group">
                    <div className="w-1.5 h-1.5 rounded-full bg-greige/50 group-hover:bg-greige transition-colors" />
                    <span>الأسئلة الشائعة</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom - Enhanced */}
          <div className="border-t border-gradient-to-r from-rocky-blue/20 via-blue-gray/20 to-greige/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-cream/60 text-sm text-center md:text-right order-2 md:order-1">
              &copy; {new Date().getFullYear()} {homepageContent?.footer?.copyright ?? 'منصة فكرة. جميع الحقوق محفوظة.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3 order-1 md:order-2" role="list" aria-label="روابط السوشيال ميديا">
              {(homepageContent?.footer?.socialLinks?.filter((l) => l.visible) ?? [
                { type: 'x', url: '#', visible: true },
                { type: 'linkedin', url: '#', visible: true },
                { type: 'instagram', url: '#', visible: true },
              ]).map((link, idx) => {
                const href = link.url || '#'
                const labels: Record<string, string> = {
                  instagram: 'انستقرام',
                  snapchat: 'سناب شات',
                  x: 'منصة X',
                  whatsapp: 'واتساب',
                  linkedin: 'لينكدإن',
                }
                const ariaLabel = labels[link.type] || link.type
                const iconClass = 'w-5 h-5 flex-shrink-0'
                return (
                  <a
                    key={idx}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={ariaLabel}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-cream/90 hover:text-cream bg-white/5 hover:bg-rocky-blue/40 dark:bg-white/5 dark:hover:bg-rocky-blue/40 border border-cream/10 hover:border-rocky-blue/40 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-rocky-blue/50 focus:ring-offset-2 focus:ring-offset-charcoal-900"
                  >
                    {link.type === 'x' && (
                      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    )}
                    {link.type === 'linkedin' && (
                      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    )}
                    {link.type === 'instagram' && (
                      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                    )}
                    {link.type === 'snapchat' && (
                      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.045-.181-.105-.494-.165-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.052-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z" />
                      </svg>
                    )}
                    {link.type === 'whatsapp' && (
                      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    )}
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
