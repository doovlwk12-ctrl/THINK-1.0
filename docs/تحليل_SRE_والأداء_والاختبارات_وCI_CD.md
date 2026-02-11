# تحليل SRE — الأداء والاختبارات وCI/CD

تحليل من منظور SRE: الأداء والكاش، تحسين الاستعلامات، تحميل الموارد وحجم الحزمة، تغطية الاختبارات والمحاكاة، أتمتة النشر، والتعافي من الأخطاء. المخرجات: تقرير أداء مع اقتراحات LCP، قائمة اختبارات مطلوبة، ونموذج GitHub Actions/Vercel.

---

## أولاً: الأداء والسرعة (Performance & Caching)

### 1.1 استراتيجيات الكاش (Caching) و ISR

- **Cache-Control في API:** app/api/packages/route.ts و app/api/content/homepage/route.ts يضبطان رؤوس الاستجابة: `Cache-Control: public, s-maxage=60, stale-while-revalidate=60`. app/api/system/health/route.ts يستخدم `Cache-Control: no-store, max-age=0`.
- **unstable_cache (Server):** packages و content/homepage يستخدمان unstable_cache مع revalidate: 60 وإبطال عبر revalidateTag من مسارات الأدمن.
- **ISR:** لا يوجد استخدام لـ generateStaticParams أو revalidate على مستوى الصفحات. الصفحة الرئيسية app/page.tsx مُعلّمة 'use client' وتجلب الباقات والمحتوى من العميل في useEffect — لا ISR.
- **توصية LCP:** تحويل الصفحة الرئيسية (أو قسم Hero + الباقات فوق الطية) إلى Server Component يجلب packages و homepage content من الخادم ويُضمّنها في HTML؛ أو صفحة هجينة حيث الباقات تُحمّل من الخادم كـ RSC لتحسين LCP.

### 1.2 تحسين الاستعلامات (Query Optimization) و N+1

- **قوائم الطلبات:** admin/orders و engineer/orders يستخدمان findMany مع include في استعلام واحد — لا N+1. orders/[id] findUnique مع include — استعلام واحد.
- **مشكلة N+1 (Cron):** app/api/cron/purge-archived-plans/route.ts — في حلقة for يُنفّذ transaction لكل طلب (تحذير) ثم transaction لكل طلب (purge) + notification.create منفصل. عدد الطلبات × عدة round-trips.
- **توصية:** تجميع تحديثات plans في updateMany (where: { id: { in: planIds } }) وتحديث الطلبات في updateMany؛ إنشاء الإشعارات في دفعة (createMany أو batch داخل transaction).

### 1.3 تحميل الموارد (Asset Optimization)

- **الصور:** next/image في صفحات الطلب والمحادثة والتعديل. next.config.js: images.domains: ['localhost']، formats: avif/webp، minimumCacheTTL: 60. إضافة remotePatterns إن وُجدت صور من نطاقات خارجية.
- **الخطوط:** app/layout.tsx — next/font (Cairo) مع display: 'swap' و preload: true.
- **Lazy Loading:** CreateOrderContent و NotificationBell يُحمّلان عبر dynamic(..., { ssr: false }).

### 1.4 تقليل حجم الحزمة (Bundle Size)

- **تبعيات:** lucide-react (استيراد أيقونات فردي)، browser-image-compression (تحميل ديناميكي في صفحة الرفع فقط)، react-hook-form، next-auth، @supabase/supabase-js، date-fns، zod. Webpack splitChunks مفعّل في next.config.js. مراقبة الحزمة عبر @next/bundle-analyzer مفيد.

---

## ثانياً: الاختبارات والاعتمادية (Testing & CI/CD)

### 2.1 تغطية الاختبارات (Testing Coverage)

- **الوضع الحالي:** vitest لـ lib/**/*.test.ts، app/api/**/*.test.ts، schemas/**/*.test.ts. موجود: orderStateMachine.test.ts، sanitize.test.ts، utils.test.ts، orderFormSchema.test.ts. Playwright + e2e/homepage.spec.ts للصفحة الرئيسية.
- **يُوصى بإضافتها فوراً:**
  - **Unit:** requireAuth/requireRole (401/403)، handleApiError (عدم كشف stack في production)، orderStateMachine (استكمال)، utils الحرجة (generateOrderNumber، isOrderExpired، getArchivePurgeDate)، منطق idempotency في payments.
  - **Integration (API):** POST /api/auth/register (400 على مدخلات غير صحيحة)، GET /api/auth/me (401 بدون جلسة)، POST /api/payments/create (401، 403 لغير العميل، idempotency).
  - **E2E:** تسجيل الدخول والوصول إلى /dashboard؛ إنشاء طلب من الباقة حتى التأكيد؛ تعزيز التحقق من الباقات على الصفحة الرئيسية.

### 2.2 محاكاة البيئة (Mocking)

- **Unit لـ API handlers:** vi.mock لـ getApiAuth و prisma؛ التحقق من 401/403/200 وبنية الاستجابة.
- **Integration مع DB:** DATABASE_URL لقاعدة اختبار (Postgres مؤقت أو SQLite)؛ هجرات ثم طلبات فعلية إلى API.
- **Supabase:** vi.mock لـ supabase/server أو مشروع اختبار Supabase حتى لا تُغيّر بيانات الإنتاج.

### 2.3 أتمتة النشر (CI/CD Pipeline)

- **الوضع الحالي:** vercel.json — buildCommand: npm run build. prebuild يشغّل check-routes. لا تشغيل lint أو tsc صريح على Vercel. لا مجلد .github/workflows.
- **توصية — نموذج GitHub Actions:** إنشاء `.github/workflows/ci.yml` مع:
  - job **lint-and-typecheck:** npm ci، npm run lint، npx tsc --noEmit
  - job **test:** npm ci، npm run test:run
  - job **build:** needs: [lint-and-typecheck, test]، env (DATABASE_URL، NEXTAUTH_SECRET، NEXTAUTH_URL)، npm run build

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:run
  build:
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, test]
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
      NEXTAUTH_URL: https://placeholder.vercel.app
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

إن لم تكن الأسرار متوفرة في GitHub يمكن جعل build يعتمد على lint و test فقط أو استخدام قيم وهمية. الهدف: منع دمج PR لا يمر فيه lint أو unit tests.

### 2.4 التعافي من الأخطاء (Error Resilience)

- **Error Boundaries:** components/ErrorBoundary.tsx و ErrorBoundaryProvider يلفان التطبيق في app/layout.tsx. صفحات المحادثة (عميل ومهندس) وصفحة إنشاء الطلب تستخدم ErrorBoundary حول المحتوى الحساس — فشل طلب API واحد لا ينهي الصفحة بالكامل.
- **توصية:** التأكد من أن قوائم وتفاصيل الطلبات إما داخل Error Boundary أو تعرض حالة خطأ محلية (retry أو رسالة واضحة).

---

## المخرجات المطلوبة

### 1. تقرير بالأداء الحالي واقتراحات لتحسين LCP

| العنصر | الوضع الحالي | اقتراح |
|--------|----------------|--------|
| الصفحة الرئيسية | Client-side؛ الباقات والمحتوى في useEffect | تقديم الباقات من الخادم (RSC) وإدراجها في HTML لتحسين LCP |
| Cache API | unstable_cache + Cache-Control 60s | الإبقاء؛ مراجعة revalidate عند تغيير وتيرة التحديث |
| الصور | next/image مع avif/webp | الإبقاء؛ إضافة remotePatterns إن لزم |
| الخطوط | next/font (Cairo) swap و preload | الإبقاء |
| التحميل الكسول | dynamic لـ CreateOrderContent و NotificationBell | تحميل ديناميكي لـ browser-image-compression في صفحة الرفع فقط |

### 2. قائمة الاختبارات التي يجب كتابتها فوراً

- **Unit (أولوية عالية):** requireAuth/requireRole (401/403)، handleApiError (عدم كشف stack في production)، orderStateMachine، utils الحرجة، منطق idempotency في payments.
- **Integration (API):** POST /api/auth/register (400)، GET /api/auth/me (401)، POST /api/payments/create (401، 403، idempotency).
- **E2E:** تسجيل الدخول و/dashboard؛ الصفحة الرئيسية والباقات؛ إنشاء طلب من الباقة حتى التأكيد.

### 3. نموذج إعدادات GitHub Actions

الملف `.github/workflows/ci.yml` كما في القسم 2.3 أعلاه. يمكن إضافة job لـ Playwright (E2E) مع npm run dev و npm run test:e2e إن رغبت بفحص E2E على كل PR.

---

## ملخص الملفات المرجعية

| الغرض | الملف |
|--------|--------|
| كاش API | app/api/packages/route.ts، app/api/content/homepage/route.ts، lib/cacheTags.ts |
| N+1 في Cron | app/api/cron/purge-archived-plans/route.ts |
| تكوين الصور والخطوط | next.config.js، app/layout.tsx |
| التحميل الديناميكي | app/(client)/orders/create/page.tsx، components/layout/Header.tsx |
| اختبارات وحدة | lib/*.test.ts، schemas/orderFormSchema.test.ts، vitest.config.ts |
| E2E | e2e/homepage.spec.ts، playwright.config.ts |
| Error Boundaries | components/ErrorBoundary.tsx، components/providers/ErrorBoundaryProvider.tsx |
| النشر | vercel.json، package.json (scripts، prebuild) |
