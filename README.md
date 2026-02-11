# منصة فكرة - منصة هندسية معمارية للتخطيط

منصة تربط بين العملاء والمهندسين المعماريين لإتمام مشاريع التخطيط المعماري.

## حالة المشروع

**الإصدار:** 2.1.0 — منصة مكتملة مع نظام إدارة مدة التنفيذ.

**الميزات الرئيسية:**
- نظام التصميم (Blueprint Aesthetic + Neo Brutalism)، خط Cairo، دعم RTL ووضع ليلي
- المصادقة والتسجيل، إنشاء الطلبات، نظام الدفع (محاكي)
- لوحة تحكم العميل والمهندس والإدارة
- المحادثة، رفع المخططات، التعديلات التفاعلية (الدبابيس)، الإشعارات

**استقرار ومراجعات:** تم تأمين مسار المحادثة (API + Middleware) وواجهة الرسائل (حالة تحميل وخطأ)، مع توثيق في `docs/` — راجع `docs/CHAT-SYSTEM-AUDIT-REPORT.md` و `docs/CHAT-SYSTEM-SOLUTION.md`.

## البدء السريع

### المتطلبات

- Node.js 18+
- PostgreSQL (راجع `prisma/schema.prisma`)
- npm أو yarn

### التثبيت

```bash
npm install
cp .env.example .env
# عدّل .env: DATABASE_URL، NEXTAUTH_SECRET، NEXTAUTH_URL=http://localhost:3000

npx prisma generate
npx prisma db push
npm run db:seed   # اختياري: بيانات تجريبية
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000).

### أرشفة الطلبات (45 يوماً)

بعد 45 يوماً من الموعد النهائي للطلب المنتهي تُحذف ملفات المخططات. أضف في `.env`:
`CRON_SECRET=كلمة_سر` ثم استدعِ:
`GET https://your-domain.com/api/cron/purge-archived-plans?key=CRON_SECRET`

## حسابات تجريبية (بعد db:seed)

| الدور   | البريد           | كلمة المرور  |
|--------|------------------|---------------|
| عميل   | client@test.com  | password123   |
| مهندس  | engineer@test.com| password123   |
| إدارة  | admin@test.com  | password123   |

لوحة العميل: `/dashboard` — المهندس: `/engineer/dashboard` — الإدارة: `/admin/dashboard`.

## أوامر مفيدة

```bash
npm run dev          # تطوير
npm run build        # بناء
npm run start        # تشغيل النسخة المبنية
npm run lint         # فحص الكود
npm run db:push      # مزامنة قاعدة البيانات
npm run db:studio    # Prisma Studio
npm run db:seed      # بيانات تجريبية
npm run sync:prisma-to-supabase-auth  # ربط حسابات User مع Supabase Auth (عند استخدام Supabase)
```

## التقنيات

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Prisma
- **Auth:** NextAuth.js أو Supabase Auth (حسب `NEXT_PUBLIC_USE_SUPABASE_AUTH`)
- **Forms:** react-hook-form + zod
- **Icons:** lucide-react + أيقونات هندسية مخصصة

بيئة الإنتاج: ضبط `.env` حسب `.env.example` (قاعدة البيانات، NextAuth أو Supabase، إلخ).

## التوثيق

| الملف | الوصف |
|-------|--------|
| `docs/CHAT-SYSTEM-AUDIT-REPORT.md` | تقرير فحص نظام المحادثة (API، Prisma، RLS، الواجهة) |
| `docs/CHAT-SYSTEM-SOLUTION.md` | دليل الحل وقائمة التحقق لخطأ 500 في المحادثة |
| `docs/CHAT-MESSAGES-AUDIT.md` | توثيق مسارات الرسائل ومعالجة الأخطاء |
| `.env.example` | نموذج متغيرات البيئة |
