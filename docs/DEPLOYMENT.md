# خطوة النشر — منصة فكرة على Vercel + Supabase  
# Deployment — Fekra Platform on Vercel + Supabase

دليل نشر المشروع على Vercel مع قاعدة بيانات ومصادقة Supabase.

---

## شرح خطوة نشر Vercel (بالترتيب)

### الخطوة 1: التأكد من المشروع جاهز للنشر

- المشروع يستخدم **PostgreSQL** في الإنتاج (في `prisma/schema.prisma` يجب أن يكون `provider = "postgresql"`).
- لديك مشروع **Supabase** مع قاعدة بيانات ورابط اتصال (Connection string).
- الكود مرفوع على **GitHub** (أو GitLab / Bitbucket).

### الخطوة 2: إنشاء المشروع على Vercel

1. ادخل إلى [vercel.com](https://vercel.com) وسجّل الدخول (أو أنشئ حساباً مرتبطاً بـ GitHub).
2. اضغط **Add New…** ثم **Project**.
3. اختر المستودع (Repository) الخاص بالمشروع. إن لم يظهر، اضغط **Import Git Repository** وربط حساب GitHub ثم اختر المستودع.
4. اختر **Framework Preset**: Next.js (يُكتشف تلقائياً عادة).
5. **Root Directory** اتركه فارغاً إلا إذا المشروع داخل مجلد فرعي.
6. **لا تضغط Deploy بعد.** انتقل أولاً إلى **Environment Variables** (أو اضغط Deploy ثم نضيف المتغيرات ونعيد النشر).

### الخطوة 3: إضافة متغيرات البيئة (Environment Variables)

من **Project → Settings → Environment Variables** (أو أثناء إنشاء المشروع)، أضف المتغيرات التالية. اختر **Production** (وإن أردت نفس القيم لـ Preview فاخترها أيضاً).

| الاسم | القيمة | مطلوب؟ |
|--------|--------|--------|
| `DATABASE_URL` | **يجب استخدام رابط الاتصال عبر الـ Pooler (وضع Transaction)** وليس الاتصال المباشر، لتجنب خطأ 503 (تعذر الاتصال بقاعدة البيانات) على Vercel. من Supabase: **Connect → Transaction** (أو Connection string → **Transaction mode**). الشكل: `postgres://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:6543/postgres` — **أضف في نهاية الرابط:** `?pgbouncer=true`. مثال كامل: `postgres://postgres:mypass@db.abcdef.supabase.co:6543/postgres?pgbouncer=true` | نعم |
| `NEXTAUTH_SECRET` | سلسلة عشوائية طويلة (32 حرفاً أو أكثر). يمكن توليدها بـ: `openssl rand -base64 32` | نعم |
| `NEXTAUTH_URL` | رابط الموقع بعد النشر، مثلاً `https://اسم-المشروع.vercel.app` (غيّره بعد أول نشر إذا اختلف الرابط) | نعم |
| `USE_SUPABASE_AUTH` | `true` | إذا تستخدم Supabase للمصادقة |
| `NEXT_PUBLIC_USE_SUPABASE_AUTH` | `true` | نفس أعلاه (مطلوب للواجهة والـ middleware) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` (من Supabase → Project Settings → API) | نعم مع Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | المفتاح **anon public** (من Supabase → API) | نعم مع Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | المفتاح **service_role** (من Supabase → API). لا تشاركه ولا تضعّه في الواجهة. | اختياري (لتغيير كلمة المرور من الملف الشخصي) |

- لا تضع مسافات قبل أو بعد القيم.
- بعد إضافة أو تعديل أي متغير، يُفضّل **إعادة النشر (Redeploy)** حتى تُحمّل القيم الجديدة.

#### إصلاح خطأ 503 (Service Unavailable) أو "تعذر الاتصال بقاعدة البيانات"

إذا ظهر خطأ **503** أو رسالة **"تعذر الاتصال بقاعدة البيانات. يرجى المحاولة لاحقاً"** عند استدعاء مسارات مثل `/api/orders/my-orders`:

1. **السبب المعتاد:** استخدام رابط الاتصال **المباشر** (Direct، منفذ 5432) بدل رابط **الـ Pooler** (Transaction mode، منفذ 6543). على Vercel (Serverless) الاتصال المباشر يستهلك عدد اتصالات كبير ويؤدي إلى فشل الطلبات.
2. **الحل:**
   - من **Supabase Dashboard** → **Project Settings** → **Database** (أو من الصفحة الرئيسية للمشروع زر **Connect**).
   - اختر **Connection string** ثم **Transaction** (وضع Transaction للـ pooler).
   - انسخ الرابط — يكون عادة بالشكل:  
     `postgres://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:6543/postgres`
   - **أضف في نهاية الرابط:** `?pgbouncer=true` (مطلوب لـ Prisma مع Transaction pooler).  
     مثال نهائي:  
     `postgres://postgres:YourPassword@db.abcdefgh.supabase.co:6543/postgres?pgbouncer=true`
   - ضع هذا الرابط في متغير `DATABASE_URL` في **Vercel → Project → Settings → Environment Variables**.
   - نفّذ **Redeploy** للنشر الحالي.

بعد التعديل يجب أن تختفي أخطاء 503 المرتبطة بقاعدة البيانات.

### الخطوة 4: النشر (Deploy)

1. اضغط **Deploy** (أو إن كنت قد نشرت مسبقاً فمن **Deployments** اختر آخر نشر ثم **⋯ → Redeploy**).
2. انتظر حتى تنتهي عملية البناء (Build). إن فشل البناء راجع سجلات (Logs) الخطأ.
3. بعد النجاح، ستظهر لك رابط مثل: `https://اسم-المشروع.vercel.app`.

### الخطوة 5: تحديث الرابط في المتغيرات وSupabase

1. **NEXTAUTH_URL**: من **Vercel → Project → Settings → Environment Variables** عدّل `NEXTAUTH_URL` ليكون مطابقاً لرابط الموقع الفعلي (مثل `https://اسم-المشروع.vercel.app`).
2. **Supabase**: من **Supabase Dashboard → Authentication → URL Configuration**:
   - **Site URL**: ضعه نفس رابط الموقع (مثل `https://اسم-المشروع.vercel.app`).
   - **Redirect URLs**: أضف نفس النطاق، وأضف أيضاً مسار إعادة تعيين كلمة المرور، مثلاً:  
     `https://اسم-المشروع.vercel.app/reset-password`
3. احفظ ثم **Redeploy** على Vercel مرة واحدة بعد تعديل `NEXTAUTH_URL`.

### الخطوة 6: تطبيق الهجرات على قاعدة الإنتاج (مرة واحدة)

يجب أن تكون جداول قاعدة البيانات موجودة على Supabase. من جهازك (مع `.env` يحتوي نفس `DATABASE_URL` المستخدم في Vercel، أي رابط Supabase):

```bash
npx prisma generate
npx prisma migrate deploy
```

أو إذا كنت تستخدم `db push` للتوافق مع المخطط بدون ملفات migrate:

```bash
npx prisma generate
npx prisma db push
```

### الخطوة 7: التحقق بعد النشر

- افتح رابط الموقع وتأكد من تحميل الصفحة الرئيسية.
- جرّب التسجيل أو تسجيل الدخول (إن كان Supabase مفعّلاً).
- تأكد من أن لوحة التحكم والطلبات تعمل وأن الاتصال بقاعدة البيانات ناجح.

---

## قبل النشر: قاعدة البيانات

على Vercel لا يمكن استخدام SQLite (ملف). يجب استخدام **PostgreSQL** من Supabase.

### 1) جعل Prisma يستخدم PostgreSQL

في المشروع محلياً:

1. افتح `prisma/schema.prisma`.
2. غيّر السطر:
   - من: `provider = "sqlite"`
   - إلى: `provider = "postgresql"`

### 2) ربط قاعدة Supabase محلياً (للتجربة قبل النشر)

في `.env`:

- غيّر `DATABASE_URL` إلى رابط الاتصال من Supabase. للنشر على Vercel استخدم **وضع Transaction (Pooler)** وليس المباشر:
  - **Supabase Dashboard → Connect (أو Database) → Connection string → Transaction**
  - استبدل `[YOUR-PASSWORD]` بكلمة مرور قاعدة البيانات (إن كان فيها `@` استبدلها بـ `%40` في الرابط)
  - أضف في النهاية: `?pgbouncer=true`

مثال (للاستخدام على Vercel أو مع Pooler):

```env
DATABASE_URL="postgresql://postgres:كلمة_المرور@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true"
```

مثال للاتصال المباشر فقط (مثلاً للتطوير المحلي أو تشغيل الهجرات):

```env
DATABASE_URL="postgresql://postgres:كلمة_المرور@db.xxxxx.supabase.co:5432/postgres"
```

ثم من الطرفية (مرة واحدة):

```bash
npx prisma generate
npx prisma db push
```

أو إذا سبق وطبّقت migrations على Supabase:

```bash
npx prisma migrate deploy
```

---

## النشر على Vercel

### 1) ربط المستودع (Git)

1. ادخل إلى [vercel.com](https://vercel.com) وسجّل الدخول.
2. **Add New → Project** واختر مستودع المشروع (GitHub/GitLab/Bitbucket).
3. اختر الفرع (مثلاً `main`) ثم **Deploy** (يمكنك ضبط الإعدادات لاحقاً).

### 2) متغيرات البيئة (Environment Variables)

من **Project → Settings → Environment Variables** أضف التالي (لجميع البيئات أو Production فقط):

| الاسم | القيمة | ملاحظة |
|--------|--------|--------|
| `DATABASE_URL` | رابط PostgreSQL عبر **Transaction pooler** (منفذ 6543) مع `?pgbouncer=true` في النهاية — راجع قسم "إصلاح خطأ 503" أعلاه | **مطلوب** |
| `NEXTAUTH_SECRET` | سلسلة عشوائية طويلة (32+ حرف) | مطلوب لـ NextAuth |
| `NEXTAUTH_URL` | رابط الموقع بعد النشر، مثلاً `https://your-app.vercel.app` | غيّره بعد أول نشر |
| `USE_SUPABASE_AUTH` | `true` | إن كنت تستخدم مصادقة Supabase — يُفضّل ضبط الاثنين معاً |
| `NEXT_PUBLIC_USE_SUPABASE_AUTH` | `true` | نفس أعلاه (الـ middleware والعميل يعتمدان عليه) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | من Supabase → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | المفتاح anon (JWT) | من Supabase → API |

- لا تضع مسافات قبل أو بعد القيم.
- بعد إضافة أو تعديل المتغيرات، أعد النشر (Redeploy).

### 3) تطبيق الهجرات على قاعدة الإنتاج (مرة واحدة)

بعد أول نشر ناجح، طبّق الهجرات على قاعدة Supabase (نفس الـ `DATABASE_URL` المستخدم في Vercel):

- إما من جهازك (بعد ضبط `DATABASE_URL` في `.env` على رابط Supabase):

  ```bash
  npx prisma migrate deploy
  ```

- أو من **Vercel → Project → Settings → Environment Variables** تأكد أن `DATABASE_URL` صحيح، ثم من الطرفية محلياً (مع `.env` يحتوي نفس الرابط):

  ```bash
  npx prisma migrate deploy
  ```

### 4) إعادة النشر بعد المتغيرات

من **Deployments** اختر آخر نشر ثم **⋯ → Redeploy** حتى تُحمّل المتغيرات الجديدة.

---

## بعد النشر

1. **NEXTAUTH_URL**: تأكد أنه يساوي رابط الموقع الفعلي (مثل `https://your-app.vercel.app`).
2. **Supabase Auth**: إن كنت تستخدم مصادقة Supabase، أضف في Supabase تحت **Authentication → URL Configuration**:
   - **Site URL**: نفس رابط الموقع (مثل `https://your-app.vercel.app`)
   - **Redirect URLs**: أضف نفس النطاق إذا تحتاج توجيه بعد تسجيل الدخول.
3. المستخدمون: من **Supabase Dashboard → Authentication → Users** أو عبر نموذج التسجيل في الموقع إن كان مربوطاً بـ Supabase.

---

## ملخص سريع

| الخطوة | الإجراء |
|--------|---------|
| 1 | في `prisma/schema.prisma`: `provider = "postgresql"` |
| 2 | في `.env`: `DATABASE_URL` = رابط Supabase (PostgreSQL) |
| 3 | محلياً: `npx prisma generate` ثم `npx prisma db push` أو `migrate deploy` |
| 4 | Vercel: ربط المستودع وإنشاء المشروع (راجع **شرح خطوة نشر Vercel** أعلاه) |
| 5 | Vercel: إضافة كل متغيرات البيئة (أعلاه) |
| 6 | Deploy ثم Redeploy بعد إضافة المتغيرات |
| 7 | ضبط NEXTAUTH_URL و Supabase (Site URL + Redirect URLs مثل `/reset-password`) |
| 8 | تشغيل `npx prisma migrate deploy` أو `db push` مرة واحدة على قاعدة الإنتاج |

بعد ذلك تكون قد وصلت إلى **خطوة النشر** واكتمال النشر على Vercel مع Supabase.
