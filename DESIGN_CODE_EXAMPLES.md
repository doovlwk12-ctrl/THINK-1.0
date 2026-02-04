# أمثلة كود جاهزة - نظام التصميم

## 🎯 نماذج جاهزة للاستخدام المباشر

---

## 1️⃣ صفحة كاملة

```tsx
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'

export default function MyPage() {
  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-charcoal dark:text-cream mb-6">
          عنوان الصفحة
        </h1>
        
        <Card>
          <p className="text-blue-gray dark:text-greige">
            محتوى الصفحة هنا
          </p>
        </Card>
      </main>
    </div>
  )
}
```

---

## 2️⃣ نموذج تسجيل دخول

```tsx
'use client'

import { useState } from 'react'
import { Card } from '@/components/shared/Card'
import { Input } from '@/components/shared/Input'
import { Button } from '@/components/shared/Button'
import { Home } from 'lucide-react'
import Link from 'next/link'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // منطق تسجيل الدخول
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Link href="/">
          <Button variant="outline" size="sm" className="w-full mb-6">
            <Home className="w-4 h-4" />
            العودة للصفحة الرئيسية
          </Button>
        </Link>
        
        <h1 className="text-3xl font-black text-center text-charcoal dark:text-cream mb-8">
          تسجيل الدخول
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
          />
          
          <Input
            label="كلمة المرور"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          
          <Button type="submit" loading={loading} className="w-full">
            تسجيل الدخول
          </Button>
        </form>
        
        <p className="mt-6 text-center text-sm text-blue-gray dark:text-greige">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="text-rocky-blue dark:text-rocky-blue-300 hover:underline font-semibold">
            إنشاء حساب
          </Link>
        </p>
      </Card>
    </div>
  )
}
```

---

## 3️⃣ قائمة بطاقات

```tsx
import { Card } from '@/components/shared/Card'
import { CheckCircle, Clock, Package } from 'lucide-react'

interface Item {
  id: string
  title: string
  description: string
  status: 'completed' | 'pending' | 'in_progress'
  date: string
}

export function ItemList({ items }: { items: Item[] }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />
      default:
        return <Package className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className="hover:shadow-hard-lg transition-all cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 bg-rocky-blue/10 dark:bg-rocky-blue/20 rounded-xl flex items-center justify-center flex-shrink-0">
                {getStatusIcon(item.status)}
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-bold text-charcoal dark:text-cream mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-blue-gray dark:text-greige mb-3">
                  {item.description}
                </p>
                <p className="text-xs text-blue-gray dark:text-greige">
                  {item.date}
                </p>
              </div>
            </div>
            
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(item.status)}`}>
              {item.status === 'completed' ? 'مكتمل' : item.status === 'in_progress' ? 'قيد التنفيذ' : 'في الانتظار'}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
```

---

## 4️⃣ جدول بيانات

```tsx
import { Card } from '@/components/shared/Card'

interface TableData {
  id: string
  name: string
  value: string
  status: string
}

export function DataTable({ data }: { data: TableData[] }) {
  return (
    <Card padding="none" className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-greige/30 dark:border-charcoal-600">
            <th className="text-right p-4 font-bold text-charcoal dark:text-cream">
              الاسم
            </th>
            <th className="text-right p-4 font-bold text-charcoal dark:text-cream">
              القيمة
            </th>
            <th className="text-center p-4 font-bold text-charcoal dark:text-cream">
              الحالة
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr 
              key={row.id} 
              className="border-b border-greige/20 dark:border-charcoal-700 hover:bg-greige/10 dark:hover:bg-charcoal-700/50 transition-colors"
            >
              <td className="p-4 text-charcoal dark:text-cream">
                {row.name}
              </td>
              <td className="p-4 text-blue-gray dark:text-greige">
                {row.value}
              </td>
              <td className="p-4 text-center">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300">
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
```

---

## 5️⃣ بطاقة إحصائيات

```tsx
import { Card } from '@/components/shared/Card'
import { TrendingUp, Users, Package, DollarSign } from 'lucide-react'

export function StatsCard({ title, value, icon: Icon, trend }: {
  title: string
  value: string | number
  icon: any
  trend?: string
}) {
  return (
    <Card className="hover:shadow-hard-lg transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-gray dark:text-greige mb-2">
            {title}
          </p>
          <p className="text-3xl font-black text-charcoal dark:text-cream">
            {value}
          </p>
          {trend && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        
        <div className="w-12 h-12 bg-rocky-blue/10 dark:bg-rocky-blue/20 rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6 text-rocky-blue dark:text-rocky-blue-300" />
        </div>
      </div>
    </Card>
  )
}

// استخدام
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <StatsCard title="إجمالي الطلبات" value="156" icon={Package} trend="+12%" />
  <StatsCard title="المستخدمين" value="1,234" icon={Users} trend="+8%" />
  <StatsCard title="الإيرادات" value="45,000" icon={DollarSign} trend="+15%" />
</div>
```

---

## 6️⃣ نموذج متعدد الخطوات

```tsx
'use client'

import { useState } from 'react'
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'

const steps = [
  { id: 1, title: 'المعلومات الأساسية' },
  { id: 2, title: 'التفاصيل' },
  { id: 3, title: 'المراجعة' }
]

export function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0)

  return (
    <div className="max-w-4xl mx-auto">
      {/* مؤشر الخطوات */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          {/* خط الربط */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-greige/30 dark:bg-charcoal-600 -z-10" />
          
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStep
            const isCurrent = idx === currentStep
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${
                  isCurrent 
                    ? 'bg-rocky-blue border-rocky-blue text-cream scale-110' 
                    : isCompleted
                    ? 'bg-rocky-blue/20 border-rocky-blue text-rocky-blue'
                    : 'bg-white dark:bg-charcoal-800 border-greige/30 text-blue-gray'
                }`}>
                  {isCompleted ? <CheckCircle className="w-6 h-6" /> : step.id}
                </div>
                <span className={`mt-2 text-xs font-medium ${
                  isCurrent ? 'text-rocky-blue dark:text-rocky-blue-300' : 'text-blue-gray dark:text-greige'
                }`}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* محتوى الخطوة */}
      <Card>
        <h2 className="text-2xl font-black text-charcoal dark:text-cream mb-6">
          {steps[currentStep].title}
        </h2>
        
        {/* محتوى النموذج هنا */}
        
        {/* أزرار التنقل */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-greige/30 dark:border-charcoal-600">
          {currentStep > 0 && (
            <Button
              onClick={() => setCurrentStep(currentStep - 1)}
              variant="outline"
              size="lg"
            >
              <ArrowRight className="w-5 h-5" />
              السابق
            </Button>
          )}
          
          {currentStep < steps.length - 1 && (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              variant="primary"
              size="lg"
              className="mr-auto"
            >
              التالي
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
```

---

## 7️⃣ بطاقة اختيار

```tsx
import { Card } from '@/components/shared/Card'
import { CheckCircle } from 'lucide-react'

interface Option {
  id: string
  title: string
  description: string
  icon: any
}

export function SelectionCard({ 
  option, 
  isSelected, 
  onSelect 
}: { 
  option: Option
  isSelected: boolean
  onSelect: () => void
}) {
  const Icon = option.icon

  return (
    <Card
      className={`relative cursor-pointer transition-all hover:shadow-hard-lg ${
        isSelected
          ? 'border-2 border-rocky-blue dark:border-rocky-blue-400 shadow-hard scale-105'
          : 'border-2 border-greige/30 dark:border-charcoal-600 hover:border-rocky-blue/50'
      }`}
      onClick={onSelect}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 z-10">
          <CheckCircle className="w-6 h-6 text-rocky-blue dark:text-rocky-blue-300" />
        </div>
      )}

      <div className="flex flex-col items-center text-center p-6">
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-all ${
          isSelected 
            ? 'bg-rocky-blue text-cream' 
            : 'bg-greige/20 dark:bg-charcoal-700 text-rocky-blue dark:text-rocky-blue-300'
        }`}>
          <Icon className="w-8 h-8" />
        </div>
        
        <h3 className={`text-lg font-bold mb-2 ${
          isSelected ? 'text-rocky-blue dark:text-rocky-blue-300' : 'text-charcoal dark:text-cream'
        }`}>
          {option.title}
        </h3>
        
        <p className="text-sm text-blue-gray dark:text-greige">
          {option.description}
        </p>
      </div>
    </Card>
  )
}
```

---

## 8️⃣ قائمة منسدلة (Accordion)

```tsx
'use client'

import { useState } from 'react'
import { Card } from '@/components/shared/Card'
import { ChevronDown } from 'lucide-react'

interface AccordionItem {
  id: string
  question: string
  answer: string
  icon: any
}

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [openItem, setOpenItem] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const Icon = item.icon
        const isOpen = openItem === item.id

        return (
          <Card key={item.id} className="overflow-hidden">
            <button
              onClick={() => setOpenItem(isOpen ? null : item.id)}
              className="w-full p-6 flex items-center justify-between text-right hover:bg-greige/5 dark:hover:bg-charcoal-700/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-rocky-blue/10 dark:bg-rocky-blue/20 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-rocky-blue dark:text-rocky-blue-300" />
                </div>
                <span className="text-lg font-bold text-charcoal dark:text-cream">
                  {item.question}
                </span>
              </div>
              
              <div className={`w-10 h-10 rounded-full bg-rocky-blue/10 dark:bg-rocky-blue/20 flex items-center justify-center transition-all ${
                isOpen ? 'bg-rocky-blue dark:bg-rocky-blue-600 text-cream rotate-180' : 'text-rocky-blue dark:text-rocky-blue-300'
              }`}>
                <ChevronDown className="w-5 h-5" />
              </div>
            </button>
            
            <div className={`overflow-hidden transition-all duration-500 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
              <div className="px-6 pb-6 pt-0">
                <div className="pt-4 border-t border-greige/30 dark:border-charcoal-600">
                  <p className="text-base leading-relaxed text-blue-gray dark:text-greige">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
```

---

## 9️⃣ شريط تقدم

```tsx
export function ProgressBar({ 
  current, 
  total, 
  label 
}: { 
  current: number
  total: number
  label?: string
}) {
  const percentage = Math.round((current / total) * 100)

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-charcoal dark:text-cream">
          {label || `${current} من ${total}`}
        </span>
        <span className="text-sm text-blue-gray dark:text-greige">
          {percentage}% مكتمل
        </span>
      </div>
      <div className="h-2 bg-greige/30 dark:bg-charcoal-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-rocky-blue to-rocky-blue-600 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
```

---

## 🔟 بطاقة سعر

```tsx
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { CheckCircle, Package } from 'lucide-react'

export function PricingCard({
  title,
  price,
  features,
  isPopular = false,
  onSelect
}: {
  title: string
  price: number
  features: string[]
  isPopular?: boolean
  onSelect: () => void
}) {
  return (
    <Card className={`relative transition-all hover:shadow-hard-lg ${
      isPopular ? 'border-2 border-rocky-blue dark:border-rocky-blue-400 scale-105' : ''
    }`}>
      {isPopular && (
        <div className="absolute -top-4 right-6 bg-gradient-to-r from-rocky-blue to-rocky-blue-600 text-cream px-6 py-2 text-sm font-black rounded-full shadow-xl border-2 border-cream dark:border-charcoal-900 flex items-center gap-2">
          <Package className="w-4 h-4" />
          <span>الأكثر طلباً</span>
        </div>
      )}

      <div className="p-6">
        <h3 className="text-2xl font-black text-charcoal dark:text-cream mb-2">
          {title}
        </h3>
        
        <div className="mb-6">
          <span className="text-4xl font-black text-rocky-blue dark:text-rocky-blue-300">
            {price}
          </span>
          <span className="text-blue-gray dark:text-greige mr-2">ريال</span>
        </div>

        <div className="space-y-3 mb-6">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-rocky-blue dark:text-rocky-blue-300 flex-shrink-0" />
              <span className="text-charcoal dark:text-cream">{feature}</span>
            </div>
          ))}
        </div>

        <Button 
          variant={isPopular ? 'primary' : 'outline'} 
          className="w-full"
          onClick={onSelect}
        >
          اختر هذه الباقة
        </Button>
      </div>
    </Card>
  )
}
```

---

## 1️⃣1️⃣ رسالة تنبيه

```tsx
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

type AlertType = 'success' | 'error' | 'warning' | 'info'

export function Alert({ 
  type = 'info', 
  message 
}: { 
  type?: AlertType
  message: string
}) {
  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-300',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-300',
      iconColor: 'text-red-600 dark:text-red-400'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-300',
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-300',
      iconColor: 'text-blue-600 dark:text-blue-400'
    }
  }

  const { icon: Icon, bg, border, text, iconColor } = config[type]

  return (
    <div className={`flex items-start gap-3 p-4 rounded-none border-2 ${bg} ${border}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
      <p className={`text-sm ${text}`}>{message}</p>
    </div>
  )
}

// استخدام
<Alert type="success" message="تم الحفظ بنجاح" />
<Alert type="error" message="حدث خطأ ما" />
<Alert type="warning" message="يرجى التحقق من البيانات" />
<Alert type="info" message="معلومة مهمة" />
```

---

## 1️⃣2️⃣ Badge (شارة)

```tsx
export function Badge({ 
  children, 
  variant = 'default' 
}: { 
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error'
}) {
  const variants = {
    default: 'bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300',
    success: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300',
    error: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${variants[variant]}`}>
      {children}
    </span>
  )
}

// استخدام
<Badge>افتراضي</Badge>
<Badge variant="success">مكتمل</Badge>
<Badge variant="warning">قيد المراجعة</Badge>
<Badge variant="error">ملغي</Badge>
```

---

## 1️⃣3️⃣ Empty State (حالة فارغة)

```tsx
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { Package, Plus } from 'lucide-react'

export function EmptyState({
  icon: Icon = Package,
  title,
  description,
  actionLabel,
  onAction
}: {
  icon?: any
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <Card className="py-16">
      <div className="text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-greige/20 dark:bg-charcoal-700 rounded-xl flex items-center justify-center mx-auto mb-6">
          <Icon className="w-10 h-10 text-blue-gray dark:text-greige" />
        </div>
        
        <h3 className="text-xl font-black text-charcoal dark:text-cream mb-3">
          {title}
        </h3>
        
        <p className="text-blue-gray dark:text-greige mb-6">
          {description}
        </p>
        
        {actionLabel && onAction && (
          <Button onClick={onAction}>
            <Plus className="w-4 h-4" />
            {actionLabel}
          </Button>
        )}
      </div>
    </Card>
  )
}

// استخدام
<EmptyState
  title="لا توجد طلبات"
  description="لم تقم بإنشاء أي طلبات بعد"
  actionLabel="إنشاء طلب جديد"
  onAction={() => router.push('/orders/create')}
/>
```

---

## 1️⃣4️⃣ Loading State

```tsx
import { Loader2 } from 'lucide-react'

export function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Loader2 className="w-10 h-10 animate-spin text-rocky-blue dark:text-rocky-blue-300" />
      {text && (
        <p className="text-blue-gray dark:text-greige">{text}</p>
      )}
    </div>
  )
}

// استخدام
<LoadingSpinner text="جاري التحميل..." />
```

---

## 1️⃣5️⃣ Skeleton Loader

```tsx
export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-charcoal-800 border-2 border-greige/30 dark:border-charcoal-600 rounded-none p-6 animate-pulse">
      <div className="h-12 w-12 bg-greige/40 dark:bg-charcoal-600 rounded-xl mb-4" />
      <div className="h-6 w-3/4 bg-greige/40 dark:bg-charcoal-600 rounded mb-3" />
      <div className="h-4 w-full bg-greige/30 dark:bg-charcoal-600 rounded mb-2" />
      <div className="h-4 w-5/6 bg-greige/30 dark:bg-charcoal-600 rounded mb-6" />
      <div className="h-10 w-full bg-greige/40 dark:bg-charcoal-600 rounded" />
    </div>
  )
}

// استخدام
{loading ? (
  <div className="grid md:grid-cols-3 gap-6">
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </div>
) : (
  // المحتوى الحقيقي
)}
```

---

## 🎨 Utility Classes مخصصة

### الظلال الصلبة

```tsx
// استخدام مباشر
<div className="shadow-hard">ظل صلب</div>
<div className="shadow-hard-lg">ظل صلب كبير</div>
<div className="shadow-3d">تأثير 3D</div>

// مع hover
<div className="shadow-hard hover:shadow-hard-lg transition-all">
  ظل يكبر عند hover
</div>
```

### الحدود المعمارية

```tsx
// زوايا معمارية
<div className="relative">
  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-rocky-blue/40" />
  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-rocky-blue/40" />
  محتوى
</div>
```

### التدرجات

```tsx
// خلفية متدرجة
<div className="bg-gradient-to-b from-cream via-cream to-greige/20 dark:from-charcoal-900 dark:via-charcoal-900 dark:to-charcoal-800">

// نص متدرج
<h1 className="bg-gradient-to-r from-rocky-blue to-rocky-blue-600 bg-clip-text text-transparent">
  عنوان متدرج
</h1>
```

---

## 💡 نصائح للاستخدام

1. **استخدم المكونات المشتركة دائماً**
2. **لا تنسَ dark: prefix**
3. **استخدم text-start للمحاذاة**
4. **استخدم أيقونات Lucide (لا إيموجي)**
5. **اتبع نظام الألوان**
6. **اختبر RTL دائماً**

---

## 🚀 البدء السريع

```bash
# 1. انسخ المثال المناسب
# 2. عدّل حسب احتياجك
# 3. تأكد من الألوان والمكونات
# 4. اختبر في الوضعين (ليلي/نهاري)
# 5. اختبر RTL
# 6. جاهز للاستخدام!
```

---

**جميع الأمثلة جاهزة للنسخ واللصق مباشرة!** 🎯

*آخر تحديث: 30 يناير 2026*
