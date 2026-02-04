# دليل نظام التصميم - منصة فكرة

## 🎨 مقدمة

هذا الدليل يوضح كيفية استخدام نظام التصميم الموحد لمنصة فكرة. يجب على جميع المطورين اتباع هذه الإرشادات لضمان تناسق التصميم.

---

## 📐 المبادئ الأساسية

### 1. Blueprint Aesthetic (الجمالية المعمارية)
- استخدام خطوط وشبكات هندسية دقيقة
- ظلال خفيفة جداً للخلفيات (opacity: 0.02)
- تأثيرات معمارية احترافية

### 2. Neo Brutalism (الوحشية الجديدة)
- حدود واضحة وقوية (border-2)
- زوايا حادة (rounded-none)
- ظلال صلبة (shadow-hard)
- خطوط عريضة (font-bold, font-black)

### 3. RTL First (العربية أولاً)
- جميع التصاميم يجب أن تدعم RTL
- استخدام خط Cairo العربي
- عكس الظلال والتأثيرات للعربية

---

## 🎨 نظام الألوان

### الألوان الأساسية

```tsx
// النمط النهاري
bg-cream          // #E0D8D0 - الخلفية الرئيسية
bg-greige         // #B3ABA1 - الخلفية الثانوية
text-charcoal     // #38383C - النص الرئيسي
text-blue-gray    // #7F878A - النص الثانوي
text-rocky-blue   // #57646C - اللون التفاعلي

// النمط الليلي
dark:bg-charcoal-900    // الخلفية الرئيسية
dark:bg-charcoal-800    // الخلفية الثانوية
dark:text-cream         // النص الرئيسي
dark:text-greige        // النص الثانوي
dark:text-rocky-blue-300 // اللون التفاعلي
```

### متى تستخدم كل لون؟

#### Charcoal (الفحمي)
```tsx
// للنصوص الرئيسية والعناوين
<h1 className="text-charcoal dark:text-cream">عنوان</h1>
```

#### Rocky Blue (الأزرق الصخري)
```tsx
// للعناصر التفاعلية والأزرار
<Button className="bg-rocky-blue text-cream">زر</Button>
<Link className="text-rocky-blue dark:text-rocky-blue-300">رابط</Link>
```

#### Blue Gray (الرمادي المزرق)
```tsx
// للنصوص الثانوية والأوصاف
<p className="text-blue-gray dark:text-greige">وصف</p>
```

#### Greige (البيج الرمادي)
```tsx
// للحدود والفواصل
<div className="border-2 border-greige/30 dark:border-charcoal-600">
```

#### Cream (الكريمي)
```tsx
// للخلفيات
<div className="bg-cream dark:bg-charcoal-900">
```

---

## 🧩 المكونات المشتركة

### Button

```tsx
import { Button } from '@/components/shared/Button'

// الأنواع المتاحة
<Button variant="primary">زر رئيسي</Button>
<Button variant="secondary">زر ثانوي</Button>
<Button variant="outline">زر محدد</Button>
<Button variant="danger">زر خطر</Button>

// الأحجام
<Button size="sm">صغير</Button>
<Button size="md">متوسط</Button>
<Button size="lg">كبير</Button>

// مع loading
<Button loading={true}>جاري التحميل...</Button>

// مع أيقونة
<Button>
  <ArrowLeft className="w-4 h-4" />
  التالي
</Button>
```

### Card

```tsx
import { Card } from '@/components/shared/Card'

// استخدام أساسي
<Card>محتوى البطاقة</Card>

// مع padding مخصص
<Card padding="none">بدون padding</Card>
<Card padding="sm">padding صغير</Card>
<Card padding="md">padding متوسط (افتراضي)</Card>
<Card padding="lg">padding كبير</Card>

// مع تأثيرات
<Card className="hover:shadow-hard-lg transition-all">
  بطاقة تفاعلية
</Card>
```

### Input

```tsx
import { Input } from '@/components/shared/Input'

// استخدام أساسي
<Input
  label="البريد الإلكتروني"
  placeholder="example@email.com"
  type="email"
/>

// مع خطأ
<Input
  label="كلمة المرور"
  error="كلمة المرور مطلوبة"
/>

// مع React Hook Form
<Input
  {...register('email')}
  label="البريد الإلكتروني"
  error={errors.email?.message}
/>
```

---

## 🔤 الخطوط

### Cairo Font

```tsx
// تم تطبيقه تلقائياً على جميع الصفحات
// الأوزان المتاحة: 400, 500, 600, 700, 800, 900

// استخدام الأوزان
<h1 className="font-black">عنوان عريض جداً (900)</h1>
<h2 className="font-bold">عنوان عريض (700)</h2>
<p className="font-semibold">نص نصف عريض (600)</p>
<p className="font-medium">نص متوسط (500)</p>
<p className="font-normal">نص عادي (400)</p>
```

---

## 🎭 الظلال والتأثيرات

### الظلال المتاحة

```tsx
// ظلال ناعمة
shadow-soft       // ظل ناعم خفيف
shadow-medium     // ظل متوسط
shadow-strong     // ظل قوي

// ظلال صلبة (Neo Brutalism)
shadow-hard       // 8px 8px 0
shadow-hard-lg    // 14px 14px 0
shadow-3d         // تأثير 3D كامل

// مثال
<Card className="shadow-hard hover:shadow-hard-lg transition-all">
  بطاقة بظل صلب
</Card>
```

### ملاحظة مهمة للـ RTL
الظلال تُعكس تلقائياً في RTL! لا حاجة لإضافة كلاسات خاصة.

```css
/* يتم تطبيقها تلقائياً */
[dir='rtl'] .shadow-hard {
  box-shadow: -8px 8px 0 rgba(56, 56, 60, 0.15);
}
```

---

## 🔄 دعم RTL

### القواعد الأساسية

#### 1. استخدام text-start بدلاً من text-right

```tsx
// ❌ خطأ
<p className="text-right">نص</p>

// ✅ صحيح
<p className="text-start">نص</p>
```

#### 2. Tailwind يعكس mr/ml تلقائياً

```tsx
// ✅ صحيح - يعمل في RTL و LTR
<div className="mr-4">محتوى</div>

// Tailwind يحولها تلقائياً إلى:
// LTR: margin-right: 1rem
// RTL: margin-left: 1rem
```

#### 3. استخدام مكتبة RTL المساعدة

```tsx
import { isRTL, getDirectionalClass, getArrowDirection } from '@/lib/rtl'

// التحقق من الاتجاه
if (isRTL()) {
  // كود خاص بالعربية
}

// الحصول على الكلاس المناسب
const className = getDirectionalClass('ml-4', 'mr-4')

// عكس الأسهم
const direction = getArrowDirection('forward') // 'left' في RTL
```

#### 4. الأيقونات والأسهم

```tsx
// للأسهم التي تحتاج عكس
<ArrowLeft className="rtl:rotate-180" />

// أو استخدام أيقونات مختلفة
{isRTL() ? <ArrowLeft /> : <ArrowRight />}
```

---

## 🎨 الأيقونات

### استخدام Lucide Icons

```tsx
import { 
  CheckCircle,    // علامة صح
  ArrowLeft,      // سهم لليسار
  Target,         // هدف
  Clock,          // ساعة
  FileText,       // ملف
  Layers,         // طبقات
  MessageCircle,  // رسالة
  Home,           // منزل
  // ... المزيد
} from 'lucide-react'

// استخدام
<CheckCircle className="w-5 h-5 text-rocky-blue" />
```

### ❌ لا تستخدم الإيموجي!

```tsx
// ❌ خطأ
<span>✅ مكتمل</span>

// ✅ صحيح
<CheckCircle className="w-4 h-4 text-green-500" />
<span>مكتمل</span>
```

---

## 📱 Responsive Design

### Breakpoints

```tsx
// Mobile First Approach
<div className="
  w-full           // mobile (default)
  sm:w-3/4         // small mobile (640px+)
  md:w-1/2         // tablet (768px+)
  lg:w-1/3         // desktop (1024px+)
  xl:w-1/4         // large desktop (1280px+)
">
```

### أمثلة عملية

```tsx
// Grid responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

// Text responsive
<h1 className="text-2xl sm:text-3xl md:text-4xl">

// Padding responsive
<div className="p-4 sm:p-6 md:p-8">

// Hide/Show responsive
<div className="hidden md:block">يظهر على الأجهزة الكبيرة فقط</div>

// Flex direction responsive
<div className="flex flex-col sm:flex-row gap-4">

// Button responsive
<Button className="w-full sm:w-auto">زر</Button>
```

### Utility Classes الجديدة

```tsx
// Container padding responsive
<div className="container-padding">
  // px-4 sm:px-6 md:px-8 lg:px-12
</div>

// Section spacing responsive
<section className="section-spacing">
  // py-12 md:py-16 lg:py-20
</section>

// Heading responsive
<h1 className="heading-responsive">
  // text-2xl sm:text-3xl md:text-4xl
</h1>

// Gap responsive
<div className="grid gap-responsive">
  // gap-4 md:gap-6 lg:gap-8
</div>

// Margin bottom responsive
<div className="mb-responsive">
  // mb-8 md:mb-12 lg:mb-16
</div>
```

### أفضل الممارسات

#### 1. استخدم Mobile First
```tsx
// ✅ صحيح
<div className="text-sm sm:text-base md:text-lg">

// ❌ خطأ
<div className="text-lg md:text-base sm:text-sm">
```

#### 2. أضف responsive classes للمكونات الجديدة
```tsx
// ✅ صحيح - Header responsive
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
  <h1 className="text-2xl sm:text-3xl">العنوان</h1>
  <Button className="w-full sm:w-auto">زر</Button>
</div>

// ❌ خطأ - ثابت على جميع الأحجام
<div className="flex justify-between items-center gap-4">
  <h1 className="text-3xl">العنوان</h1>
  <Button>زر</Button>
</div>
```

#### 3. اختبر على أجهزة مختلفة
- استخدم Chrome DevTools (F12 → Toggle Device Toolbar)
- اختبر على أجهزة فعلية
- راجع [RESPONSIVE_TESTING.md](RESPONSIVE_TESTING.md) للتفاصيل

---

## 🎯 أمثلة عملية

### صفحة تسجيل دخول

```tsx
<div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center p-4">
  <Card className="w-full max-w-md">
    <h1 className="text-3xl font-black text-charcoal dark:text-cream mb-6">
      تسجيل الدخول
    </h1>
    
    <form className="space-y-6">
      <Input
        label="البريد الإلكتروني"
        type="email"
        placeholder="example@email.com"
      />
      
      <Input
        label="كلمة المرور"
        type="password"
        placeholder="••••••••"
      />
      
      <Button type="submit" className="w-full">
        تسجيل الدخول
      </Button>
    </form>
  </Card>
</div>
```

### بطاقة منتج

```tsx
<Card className="group hover:shadow-hard-lg transition-all cursor-pointer">
  <div className="p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 bg-rocky-blue/10 dark:bg-rocky-blue/20 rounded-xl flex items-center justify-center">
        <Package className="w-6 h-6 text-rocky-blue dark:text-rocky-blue-300" />
      </div>
      <h3 className="text-xl font-black text-charcoal dark:text-cream">
        باقة مميزة
      </h3>
    </div>
    
    <p className="text-blue-gray dark:text-greige mb-4">
      وصف الباقة هنا
    </p>
    
    <div className="flex items-center justify-between">
      <span className="text-2xl font-black text-rocky-blue dark:text-rocky-blue-300">
        1000 ريال
      </span>
      <Button variant="outline" size="sm">
        اختر الباقة
      </Button>
    </div>
  </div>
</Card>
```

### قائمة بحالات مختلفة

```tsx
<div className="space-y-4">
  {items.map((item) => (
    <Card key={item.id} className="p-4 hover:border-rocky-blue/50 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-rocky-blue" />
          <span className="font-semibold text-charcoal dark:text-cream">
            {item.title}
          </span>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
          item.status === 'completed' 
            ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
            : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
        }`}>
          {item.status}
        </span>
      </div>
    </Card>
  ))}
</div>
```

---

## ⚠️ أخطاء شائعة يجب تجنبها

### 1. استخدام ألوان خارج النظام

```tsx
// ❌ خطأ
<div className="bg-gray-100 text-gray-900">

// ✅ صحيح
<div className="bg-cream dark:bg-charcoal-900 text-charcoal dark:text-cream">
```

### 2. نسيان الوضع الليلي

```tsx
// ❌ خطأ
<Card className="bg-white">

// ✅ صحيح
<Card className="bg-white dark:bg-charcoal-800">
```

### 3. استخدام rounded-lg بدلاً من rounded-none

```tsx
// ❌ خطأ (لا يتماشى مع Neo Brutalism)
<Button className="rounded-lg">

// ✅ صحيح
<Button className="rounded-none">
```

### 4. استخدام الإيموجي

```tsx
// ❌ خطأ
<span>✅ مكتمل</span>

// ✅ صحيح
<div className="flex items-center gap-2">
  <CheckCircle className="w-4 h-4 text-green-500" />
  <span>مكتمل</span>
</div>
```

### 5. تجاهل RTL

```tsx
// ❌ خطأ
<div className="text-left ml-4">

// ✅ صحيح
<div className="text-start mr-4">
```

---

## 📋 Checklist للمراجعة

عند إضافة صفحة أو مكون جديد، تأكد من:

- [ ] استخدام الألوان من نظام التصميم فقط
- [ ] دعم الوضع الليلي (dark:)
- [ ] دعم RTL كامل
- [ ] استخدام المكونات المشتركة
- [ ] استخدام أيقونات Lucide (لا إيموجي)
- [ ] تطبيق مبادئ Neo Brutalism
- [ ] Responsive على جميع الأحجام
- [ ] التباين كافٍ للقراءة (4.5:1+)
- [ ] الخط واضح ومقروء
- [ ] الظلال متسقة

---

## 🚀 نصائح للأداء

1. **استخدم المكونات المشتركة**: لا تعيد كتابة Button أو Card
2. **Lazy Loading للأيقونات**: استورد فقط ما تحتاج
3. **تجنب inline styles**: استخدم Tailwind classes
4. **استخدم CSS variables**: للألوان الديناميكية

---

## 📚 موارد إضافية

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/)
- [Cairo Font](https://fonts.google.com/specimen/Cairo)
- [Next.js Docs](https://nextjs.org/docs)

---

## 💬 الدعم

إذا كان لديك أسئلة حول نظام التصميم:
1. راجع هذا الدليل أولاً
2. انظر إلى الأمثلة في الكود الموجود
3. اسأل الفريق

---

**آخر تحديث**: 30 يناير 2026
