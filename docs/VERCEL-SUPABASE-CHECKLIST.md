# تشغيل المشروع على Vercel + Supabase بشكل صحيح — قائمة تحقق كاملة

دليل واحد لتشغيل **منصة فكرة** على **Vercel** مع **Supabase** (قاعدة بيانات، مصادقة، تخزين) بدون أخطاء 503 أو فشل اتصال.

---

## 1. متطلبات مسبقة

- [ ] مشروع Supabase منشأ ونشط (غير Paused).
- [ ] الكود مرفوع على GitHub ومرتبط بمشروع Vercel.
- [ ] في `prisma/schema.prisma`: `provider = "postgresql"`.

---

## 2. قاعدة البيانات (Supabase) — تجنب 503

على Vercel (Serverless) **يجب** استخدام **وضع Transaction (Pooler)** وليس الاتصال المباشر.

| الخطوة | الإجراء |
|--------|---------|
| 1 | من **Supabase Dashboard** → **Connect** (أو Project Settings → Database). |
| 2 | اختر **Connection string** ثم **Transaction** (منفذ **6543**). |
| 3 | انسخ الرابط واستبدل `[YOUR-PASSWORD]` بكلمة مرور قاعدة البيانات. إن كانت كلمة المرور تحتوي على `@` أو `#` استبدلها بـ `%40` أو `%23`. |
| 4 | **أضف في نهاية الرابط:** `?pgbouncer=true` (مطلوب لـ Prisma مع Transaction mode). للإنتاج يمكن إضافة: `&sslmode=require`. |
| 5 | مثال نهائي: `postgres://postgres:YourPassword@db.xxxxxxxx.supabase.co:6543/postgres?pgbouncer=true` أو مع SSL: `...?pgbouncer=true&sslmode=require` |

هذا الرابط هو الذي ستضعه في **`DATABASE_URL`** على Vercel. لا تستخدم الرابط المباشر (منفذ 5432) على Vercel وإلا ستظهر أخطاء 503 أو "تعذر الاتصال بقاعدة البيانات".

---

## 3. متغيرات البيئة على Vercel

من **Vercel → مشروعك → Settings → Environment Variables** أضف التالي (لـ Production و Preview إن أردت):

| المتغير | القيمة | مطلوب |
|---------|--------|--------|
| `DATABASE_URL` | رابط Pooler (Transaction) كما في القسم 2، مع `?pgbouncer=true` | نعم |
| `NEXTAUTH_SECRET` | سلسلة عشوائية 32 حرفاً فأكثر (مثلاً `openssl rand -base64 32`) | نعم |
| `NEXTAUTH_URL` | رابط الموقع بعد النشر، مثلاً `https://اسم-المشروع.vercel.app` | نعم |
| `NEXT_PUBLIC_SUPABASE_URL` | من Supabase → Project Settings → API → **Project URL** | نعم مع Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | من Supabase → API → **anon public** | نعم مع Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | من Supabase → API → **service_role** (سري؛ للرفع إلى Storage وتحديث المستخدم) | نعم لرفع الملفات وميزات الأدمن |
| `USE_SUPABASE_AUTH` | `true` | إذا تستخدم مصادقة Supabase |
| `NEXT_PUBLIC_USE_SUPABASE_AUTH` | `true` | نفس أعلاه (مطلوب للواجهة والـ middleware) |
| `HEALTH_CHECK_SECRET` | (اختياري) سري لاستدعاء `/api/system/health` | اختياري |

- لا مسافات قبل أو بعد القيم.
- بعد أي تعديل: **Redeploy** حتى تُحمّل القيم الجديدة.

---

## 4. إعداد Supabase Auth (URL Configuration)

من **Supabase Dashboard → Authentication → URL Configuration**:

| الحقل | القيمة |
|-------|--------|
| **Site URL** | نفس رابط الموقع، مثلاً `https://اسم-المشروع.vercel.app` |
| **Redirect URLs** | أضف: `https://اسم-المشروع.vercel.app`, `https://اسم-المشروع.vercel.app/login`, `https://اسم-المشروع.vercel.app/reset-password` (واستبدل النطاق إن استخدمت دومين مخصص) |

بدون ذلك قد يفشل تسجيل الدخول أو إعادة تعيين كلمة المرور.

---

## 5. تخزين الملفات (Supabase Storage)

المشروع يرفع ملفات المهندس إلى bucket باسم **orders**.

| الخطوة | الإجراء |
|--------|---------|
| 1 | من **Supabase → Storage** أنشئ bucket باسم **orders** إن لم يكن موجوداً. |
| 2 | (اختياري) حدد **File size limit** (مثلاً 10 MB) و **Allowed MIME types** (مثل `image/jpeg`, `image/png`, `application/pdf`). |
| 3 | رفع الملفات يتم من السيرفر عبر **SUPABASE_SERVICE_ROLE_KEY**؛ تأكد أن هذا المتغير مضبوط على Vercel. |

بدون **SUPABASE_SERVICE_ROLE_KEY** لن يعمل رفع المخططات على Vercel (التخزين المحلي غير متاح هناك).

---

## 6. الجداول على Supabase (مرة واحدة)

يجب أن تكون جداول المشروع موجودة في قاعدة Supabase. من جهازك (مع `.env` يحتوي نفس `DATABASE_URL` المستخدم على Vercel):

```bash
npx prisma generate
npx prisma db push
```

أو إن كنت تستخدم Migrations:

```bash
npx prisma migrate deploy
```

إن ظهر خطأ P4002 (Cross schema references) راجع **docs/supabase-fix-fk-for-prisma.sql** ونفّذ الأمر فيه من Supabase SQL Editor ثم أعد `db push`.

---

## 7. النشر على Vercel

1. من Vercel: **Deploy** (أو **Redeploy** بعد إضافة/تعديل المتغيرات).
2. بعد انتهاء البناء، افتح رابط المشروع (مثلاً `https://اسم-المشروع.vercel.app`).
3. عدّل **NEXTAUTH_URL** إن كان الرابط الفعلي مختلفاً، ثم **Redeploy** مرة واحدة.

---

## 8. التحقق بعد النشر

- [ ] الصفحة الرئيسية تُحمّل.
- [ ] التسجيل / تسجيل الدخول يعمل (إن كان Supabase Auth مفعّلاً).
- [ ] لوحة التحكم والطلبات تعمل (اتصال قاعدة البيانات ناجح).
- [ ] رفع ملف من قسم المهندس يعمل (Storage bucket **orders** + **SUPABASE_SERVICE_ROLE_KEY**).

---

## أخطاء شائعة وحلولها

| المشكلة | السبب المحتمل | الحل |
|---------|----------------|------|
| 503 أو "تعذر الاتصال بقاعدة البيانات" | استخدام رابط اتصال **مباشر** (منفذ 5432) بدل **Transaction** (منفذ 6543) | استخدم رابط Pooler مع `?pgbouncer=true` في `DATABASE_URL` (انظر القسم 2). |
| فشل تسجيل الدخول أو إعادة تعيين كلمة المرور | Site URL أو Redirect URLs غير مضبوطين في Supabase | راجع القسم 4. |
| رفع الملفات لا يعمل على Vercel | عدم وجود **SUPABASE_SERVICE_ROLE_KEY** أو bucket **orders** | أضف المتغير على Vercel وأنشئ bucket **orders** (القسم 5). |
| خطأ Prisma "prepared statement" | استخدام Transaction mode بدون `pgbouncer=true` | أضف `?pgbouncer=true` إلى نهاية `DATABASE_URL`. |

---

للتفاصيل الإضافية (خطوات إنشاء المشروع على Vercel، إعداد Git، إلخ) راجع **docs/DEPLOYMENT.md**.
