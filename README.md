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

### أرشفة الطلبات وحذف الملفات

1. **انتهاء وقت الطلب** → الطلب يظهر في الأرشيف (عرض فقط، التحميل متاح حتى انتهاء المدة).
2. **بعد 15 يوماً من الموعد النهائي** (قابل للتعديل في `lib/utils.ts`: `ARCHIVE_PURGE_DAYS_AFTER_DEADLINE`): يُستدعى الـ cron فينقل ملفات المخططات من مجلد `plans/` إلى مجلد **`archive/`** في التخزين (Supabase). الطلب يبقى في الأرشيف لكن **بدون إمكانية تحميل المخططات**.
3. **بعد مدة احتفاظ بالأرشيف** (افتراضي 15 يوماً، في `lib/utils.ts`: `ARCHIVE_RETENTION_DAYS`): يحذف الـ cron الملفات **نهائياً** من التخزين (مجلد `archive/`). يمكن تغيير المدة بالاتفاق.

أضف في `.env`: `CRON_SECRET=كلمة_سر` ثم استدعِ يومياً:
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

### التخزين (المخططات والصور)

- **على Vercel (أو أي استضافة بدون قرص ثابت):** التخزين المحلي غير متوفر. يجب إعداد **Supabase Storage** حتى تظهر صور المخططات وتعمل رفع الملفات:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - إنشاء bucket باسم **`orders`** في لوحة Supabase (ويفضّل جعله عاماً أو الاعتماد على مسار العرض `/api/orders/.../plans/.../image`).
- إذا رُفعت الملفات محلياً (`public/uploads/plans/`) ثم نُشر التطبيق على Vercel، الملفات غير موجودة على السيرفر فـ **الصور لن تظهر**؛ الحل: إعداد Supabase ورفع المخططات من جديد من لوحة المهندس.
- **تفريق بيانات العملاء:** ملفات كل طلب تُحفظ تحت مسار منفصل: **`plans/{orderId}/{ملف}`** (في bucket `orders`). بذلك لا يختلط طلب عميل بآخر، وعمل مهندس على طلب لا يؤثر على رفع طلب آخر، والحدود (حجم/عدد) تُطبَّق لكل طلب على حدة.
- **حدود الرفع:** لكل ملف حد 10MB عند الرفع، وبعد الحفظ يُقبل حتى 5MB (وإلا يُحذف الملف ويرجع خطأ). المجموع للملفات غير المرسلة في الطلب الواحد يبقى تحت 30MB. هذه الحدود لكل طلب ولا تمنع عمل باقي الطلبة أو العملاء.

## التوثيق

| الملف | الوصف |
|-------|--------|
| `docs/CHAT-SYSTEM-AUDIT-REPORT.md` | تقرير فحص نظام المحادثة (API، Prisma، RLS، الواجهة) |
| `docs/CHAT-SYSTEM-SOLUTION.md` | دليل الحل وقائمة التحقق لخطأ 500 في المحادثة |
| `docs/CHAT-MESSAGES-AUDIT.md` | توثيق مسارات الرسائل ومعالجة الأخطاء |
| `.env.example` | نموذج متغيرات البيئة |
