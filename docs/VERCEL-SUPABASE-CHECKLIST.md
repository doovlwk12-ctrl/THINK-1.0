# تشغيل المشروع على Vercel + Supabase بشكل صحيح — قائمة تحقق كاملة

دليل واحد لتشغيل **منصة فكرة** على **Vercel** مع **Supabase** (قاعدة بيانات، مصادقة، تخزين) بدون أخطاء 503 أو فشل اتصال.

---

## إذا ظهر 500 على التسجيل أو الباقات أو المحتوى (إصلاح سريع)

غالباً السبب **عدم اتصال التطبيق بقاعدة البيانات** على Vercel:

1. **Vercel → مشروعك → Settings → Environment Variables**
   - تأكد وجود **`DATABASE_URL`**.
   - القيمة يجب أن تكون رابط **Supabase** بوضع **Transaction** (منفذ **6543**) وليس المباشر (5432).
   - في **نهاية** الرابط يجب أن يكون: **`?pgbouncer=true`**  
     مثال: `postgres://postgres:كلمة_المرور@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true`
2. احفظ ثم من **Deployments** اختر آخر نشر → **⋯ → Redeploy**.
3. بعد انتهاء البناء جرّب التسجيل أو الصفحة الرئيسية مرة أخرى.

إن استمر الخطأ راجع القسم 2 (قاعدة البيانات) والجدول "أخطاء شائعة" في نهاية الملف.

---

## حل نهائي: عدم القدرة على إنشاء حساب أو تسجيل الدخول

اتبع الخطوات بالترتيب ثم أعد النشر والتحقق:

1. **Supabase**
   - تأكد أن المشروع **غير Paused** (من لوحة Supabase).
   - **Authentication → URL Configuration:** ضع **Site URL** و **Redirect URLs** = رابط موقعك على Vercel (مثل `https://اسم-المشروع.vercel.app` و `/login`, `/reset-password`).
   - **Authentication → Providers → Email:** فعّل **Enable Email Signup** حتى يقبل Supabase طلبات التسجيل من الموقع.

2. **Vercel → Settings → Environment Variables**
   - تأكد وجود كل المتغيرات المطلوبة. **DATABASE_URL** = رابط **Transaction (منفذ 6543)** مع **`?pgbouncer=true`** في النهاية، **بدون مسافات** قبل أو بعد القيمة، وبدون أقواس حول كلمة المرور في الرابط.
   - تأكد: **NEXT_PUBLIC_SUPABASE_URL**, **NEXT_PUBLIC_SUPABASE_ANON_KEY**, **USE_SUPABASE_AUTH**, **NEXT_PUBLIC_USE_SUPABASE_AUTH**. لتفعيل تأكيد البريد تلقائياً بعد التسجيل: **SUPABASE_SERVICE_ROLE_KEY**.

3. **مرة واحدة (من جهازك)**
   - في `.env` ضع نفس **DATABASE_URL** المستخدم على Vercel.
   - نفّذ: `npx prisma generate` ثم `npx prisma db push` (أو `prisma migrate deploy` إن كنت تستخدم migrations) حتى تكون جداول التطبيق موجودة في قاعدة Supabase.

4. **Redeploy**
   - من **Vercel → Deployments** اختر آخر نشر → **⋯ → Redeploy** (بعد أي تعديل على المتغيرات).

5. **التحقق**
   - استدعِ `GET /api/system/health` مع هيدر `x-health-secret` أو `?secret=` يساوي `HEALTH_CHECK_SECRET`. تأكد أن **database.ok** و **auth.ok** = true.
   - جرّب إنشاء حساب من **/register** وتسجيل الدخول من **/login**.

إن استمر الفشل راجع جدول **"أخطاء شائعة وحلولها"** في نهاية هذا الملف، أو **Vercel → Deployments → Logs** لطلب `POST /api/auth/register` وسطر "Register failed" لمعرفة الرسالة أو رمز الخطأ الفعلي.

---

## فهم أخطاء الكونسول (Console) الشائعة

| الرسالة | المعنى | الحل |
|---------|--------|------|
| **favicon.ico 404** | المتصفح يطلب أيقونة الموقع ولم يجد ملفاً عند `/favicon.ico`. | المشروع يوفّر الآن مساراً لأيقونة الموقع (وديناميكياً عند `/favicon.ico`). بعد دفع التحديثات وإعادة النشر يختفي الخطأ. |
| **api/content/homepage 500** | طلب محتوى الصفحة الرئيسية من قاعدة البيانات فشل (اتصال أو جدول). | نفس سبب 500 التسجيل: **DATABASE_URL** على Vercel يجب أن يكون رابط **Transaction (6543)** مع **`?pgbouncer=true`** ثم **Redeploy**. |
| **api/packages 500** | طلب قائمة الباقات من قاعدة البيانات فشل. | نفس الحل أعلاه (اتصال قاعدة البيانات). |
| **Failed to fetch packages: حدث خطأ ما** | نتيجة من واجهة التطبيق لأن `api/packages` أرجع 500. | يُحلّ بإصلاح **DATABASE_URL** وإعادة النشر. |
| **api/auth/register 500** | طلب إنشاء حساب فشل على السيرفر (قاعدة بيانات أو Supabase). | تأكد **DATABASE_URL** ووجود **NEXT_PUBLIC_SUPABASE_URL** و **NEXT_PUBLIC_SUPABASE_ANON_KEY** عند استخدام مصادقة Supabase، ثم **Redeploy**. راجع Vercel → Logs لسطر "Register failed" لمعرفة السبب الدقيق. |

**الخلاصة:** غالباً أخطاء 500 على `/api/...` من نفس السبب: **فشل الاتصال بقاعدة البيانات** على Vercel. الحل: ضبط **DATABASE_URL** ورابط **Transaction** مع **`?pgbouncer=true`** ثم **Redeploy**.

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

1. (اختياري) تشغيل سكربت التحقق من متغيرات البيئة قبل الدفع: `npm run verify-env`. على Vercel يُشغَّل تلقائياً مع `npm run build` (prebuild). إن كان `NEXT_PUBLIC_USE_SUPABASE_AUTH=true` يجب وجود `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_ANON_KEY`؛ وعلى Vercel يجب أن يحتوي `DATABASE_URL` على `?pgbouncer=true`.
2. من Vercel: **Deploy** (أو **Redeploy** بعد إضافة/تعديل المتغيرات).
3. بعد انتهاء البناء، افتح رابط المشروع (مثلاً `https://اسم-المشروع.vercel.app`).
4. عدّل **NEXTAUTH_URL** إن كان الرابط الفعلي مختلفاً، ثم **Redeploy** مرة واحدة.
5. للتحقق بعد النشر (صحة النظام، التسجيل، رفع الملفات) راجع **docs/TESTING-PLAN.md**.

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
| **500 على التسجيل أو /api/packages أو /api/content/homepage** | غالباً **فشل الاتصال بقاعدة البيانات**: `DATABASE_URL` غير مضبوط على Vercel، أو استخدام رابط **مباشر** (منفذ 5432) بدل **Transaction** (منفذ 6543). | 1) من Vercel → Settings → Environment Variables تأكد وجود **DATABASE_URL**. 2) استخدم رابط **Transaction** من Supabase (منفذ **6543**) مع **`?pgbouncer=true`** في نهاية الرابط (انظر القسم 2). 3) Redeploy بعد التعديل. |
| 503 أو "تعذر الاتصال بقاعدة البيانات" | نفس أعلاه: رابط خاطئ أو مفقود. | استخدم رابط Pooler مع `?pgbouncer=true` في `DATABASE_URL` (انظر القسم 2). |
| 404 على مسار API | مسار خاطئ أو مشروع لم يُبنَ من آخر commit. | تأكد من الرابط (مثلاً `/api/packages` وليس `api/packages`). وتأكد أن Vercel يبني من الفرع الصحيح (مثلاً main). |
| فشل تسجيل الدخول أو إعادة تعيين كلمة المرور | Site URL أو Redirect URLs غير مضبوطين في Supabase | راجع القسم 4. |
| رفع الملفات لا يعمل على Vercel | عدم وجود **SUPABASE_SERVICE_ROLE_KEY** أو bucket **orders** | أضف المتغير على Vercel وأنشئ bucket **orders** (القسم 5). |
| خطأ Prisma "prepared statement" | استخدام Transaction mode بدون `pgbouncer=true` | أضف `?pgbouncer=true` إلى نهاية `DATABASE_URL`. |
| شاشة بيضاء أو خطأ عند فتح /login أو /register | `NEXT_PUBLIC_USE_SUPABASE_AUTH=true` مع غياب `NEXT_PUBLIC_SUPABASE_URL` أو `NEXT_PUBLIC_SUPABASE_ANON_KEY` | أضف المتغيرين على Vercel (Production/Preview حسب بيئة البناء) ثم Redeploy. إن كان البناء ينجح رغم النقص، شغّل `npm run verify-env` محلياً قبل الدفع؛ مع prebuild سيفشل البناء على Vercel عند تركيب env غير مكتمل. |
| **إضافة مستخدم من لوحة Supabase (Authentication) فقط ثم تسجيل الدخول يظهر خطأ والصفحة تبقى تحمّل** | المستخدم موجود في Supabase Auth لكن التطبيق لا يستطيع إنشاء/قراءة سجله في جدول `User` (غالباً فشل اتصال قاعدة البيانات: `DATABASE_URL` خاطئ أو بدون `?pgbouncer=true`). | 1) تأكد أن **DATABASE_URL** على Vercel = رابط **Transaction (6543)** مع **`?pgbouncer=true`**. 2) **Redeploy**. 3) بعد تسجيل الدخول ينشئ التطبيق سجلاً في جدول User تلقائياً عند أول طلب. إن استمر الخطأ راجع Vercel Logs لـ `/api/auth/me`. |

---

## وثائق ذات صلة

- **docs/DEPLOY-GITHUB-SUPABASE.md** — رفع المشروع خطوة بخطوة عبر GitHub و Supabase ثم النشر.
- **docs/TESTING-PLAN.md** — خطة الفحص والتأكد من عمل المشروع بشكل صحيح وخالٍ من الأخطاء (محلياً وعلى Vercel).
- **docs/DEPLOYMENT.md** — خطوات إنشاء المشروع على Vercel وإعداد Git (إن وُجد).
