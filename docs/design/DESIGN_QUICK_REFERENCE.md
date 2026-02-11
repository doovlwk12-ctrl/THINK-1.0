# مرجع سريع - نظام التصميم

## 🎨 الألوان

### Light Mode
```css
bg-cream          #E0D8D0  /* خلفية */
bg-greige         #B3ABA1  /* خلفية ثانوية */
text-charcoal     #38383C  /* نص رئيسي */
text-blue-gray    #7F878A  /* نص ثانوي */
text-rocky-blue   #57646C  /* تفاعلي */
```

### Dark Mode
```css
dark:bg-charcoal-900    #1f2023  /* خلفية */
dark:bg-charcoal-800    #38383C  /* خلفية ثانوية */
dark:text-cream         #f5f2ed  /* نص رئيسي */
dark:text-greige        #B3ABA1  /* نص ثانوي */
dark:text-rocky-blue-300 #a1aeb6 /* تفاعلي */
```

---

## 🧩 المكونات

### Button
```tsx
<Button variant="primary">رئيسي</Button>
<Button variant="secondary">ثانوي</Button>
<Button variant="outline">محدد</Button>
<Button variant="danger">خطر</Button>

<Button size="sm">صغير</Button>
<Button size="md">متوسط</Button>
<Button size="lg">كبير</Button>

<Button loading={true}>تحميل</Button>
```

### Card
```tsx
<Card>محتوى</Card>
<Card padding="none">بدون padding</Card>
<Card padding="sm">صغير</Card>
<Card padding="lg">كبير</Card>
```

### Input
```tsx
<Input label="العنوان" placeholder="..." />
<Input error="رسالة خطأ" />
```

---

## 🎭 الظلال

```css
shadow-soft       /* ناعم */
shadow-medium     /* متوسط */
shadow-strong     /* قوي */
shadow-hard       /* صلب 8px */
shadow-hard-lg    /* صلب كبير 14px */
shadow-3d         /* 3D كامل */
```

---

## 🔤 الخطوط

```css
font-normal       /* 400 */
font-medium       /* 500 */
font-semibold     /* 600 */
font-bold         /* 700 */
font-black        /* 900 */
```

---

## 📐 المسافات

```css
p-4    /* 1rem */
p-6    /* 1.5rem */
p-8    /* 2rem */

gap-2  /* 0.5rem */
gap-4  /* 1rem */
gap-6  /* 1.5rem */
```

---

## 🎯 الأيقونات الشائعة

```tsx
import {
  CheckCircle,    // ✓
  Target,         // 🎯
  Clock,          // ⏱️
  FileText,       // 📋
  Layers,         // 💼
  MessageCircle,  // 💬
  ArrowLeft,      // →
  Home,           // 🏠
  Package,        // 📦
} from 'lucide-react'

<CheckCircle className="w-5 h-5 text-rocky-blue" />
```

---

## 🔄 RTL

```tsx
// محاذاة
text-start        /* يمين في RTL */

// مسافات (تعكس تلقائياً)
mr-4              /* يصبح ml-4 في RTL */

// أسهم
<ArrowLeft className="rtl:rotate-180" />
```

---

## 📱 Responsive

```css
/* Mobile First */
w-full           /* mobile */
md:w-1/2         /* tablet 768px+ */
lg:w-1/3         /* desktop 1024px+ */
xl:w-1/4         /* large 1280px+ */
```

---

## 🎨 حالات الألوان

### Success
```css
bg-green-100 dark:bg-green-900/40
text-green-800 dark:text-green-300
border-green-200 dark:border-green-800
```

### Warning
```css
bg-yellow-100 dark:bg-yellow-900/40
text-yellow-800 dark:text-yellow-300
border-yellow-200 dark:border-yellow-800
```

### Error
```css
bg-red-100 dark:bg-red-900/40
text-red-800 dark:text-red-300
border-red-200 dark:border-red-800
```

### Info
```css
bg-blue-100 dark:bg-blue-900/40
text-blue-800 dark:text-blue-300
border-blue-200 dark:border-blue-800
```

---

## ⚡ نماذج سريعة

### صفحة كاملة
```tsx
<div className="min-h-screen bg-cream dark:bg-charcoal-900">
  <Header />
  <main className="container mx-auto px-4 py-8">
    {/* محتوى */}
  </main>
</div>
```

### بطاقة
```tsx
<Card className="hover:shadow-hard-lg transition-all">
  <h3 className="text-xl font-black text-charcoal dark:text-cream mb-4">
    عنوان
  </h3>
  <p className="text-blue-gray dark:text-greige">
    وصف
  </p>
</Card>
```

### نموذج
```tsx
<form className="space-y-6">
  <Input label="الاسم" />
  <Input label="البريد" type="email" />
  <Button type="submit" className="w-full">
    إرسال
  </Button>
</form>
```

### قائمة
```tsx
<div className="space-y-4">
  {items.map(item => (
    <Card key={item.id} className="p-4">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-rocky-blue" />
        <span className="font-semibold">{item.title}</span>
      </div>
    </Card>
  ))}
</div>
```

---

## ❌ تجنب

```tsx
// ❌ ألوان خارج النظام
bg-gray-100

// ❌ إيموجي
<span>✅</span>

// ❌ rounded-lg
rounded-lg

// ❌ text-right
text-right

// ❌ margin-right مباشر
style={{ marginRight: '1rem' }}
```

---

## ✅ استخدم

```tsx
// ✅ ألوان النظام
bg-cream dark:bg-charcoal-900

// ✅ أيقونات Lucide
<CheckCircle />

// ✅ rounded-none
rounded-none

// ✅ text-start
text-start

// ✅ Tailwind classes
mr-4
```

---

**آخر تحديث**: 30 يناير 2026
