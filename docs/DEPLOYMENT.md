# خطوة النشر — منصة فكرة على Vercel + Supabase  
# Deployment — Fekra Platform on Vercel + Supabase

دليل نشر المشروع على Vercel مع قاعدة بيانات ومصادقة Supabase.

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

- غيّر `DATABASE_URL` إلى رابط الاتصال من Supabase:
  - **Supabase Dashboard → Project Settings → Database → Connection string (URI)**
  - استبدل `[YOUR-PASSWORD]` بكلمة مرور قاعدة البيانات (إن كان فيها `@` استبدلها بـ `%40` في الرابط)

مثال:

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
| `DATABASE_URL` | رابط PostgreSQL من Supabase (Connection string URI) | **مطلوب** |
| `NEXTAUTH_SECRET` | سلسلة عشوائية طويلة (32+ حرف) | مطلوب لـ NextAuth |
| `NEXTAUTH_URL` | رابط الموقع بعد النشر، مثلاً `https://your-app.vercel.app` | غيّره بعد أول نشر |
| `USE_SUPABASE_AUTH` | `true` | إن كنت تستخدم مصادقة Supabase |
| `NEXT_PUBLIC_USE_SUPABASE_AUTH` | `true` | نفس أعلاه |
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
| 4 | Vercel: ربط المستودع وإنشاء المشروع |
| 5 | Vercel: إضافة كل متغيرات البيئة (أعلاه) |
| 6 | Redeploy ثم تشغيل `npx prisma migrate deploy` مرة واحدة على قاعدة الإنتاج |
| 7 | ضبط NEXTAUTH_URL و Supabase Site URL حسب رابط الموقع |

بعد ذلك تكون قد وصلت إلى **خطوة النشر** واكتمال النشر على Vercel مع Supabase.
