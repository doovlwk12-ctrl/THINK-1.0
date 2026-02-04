# بعد إنشاء Supabase — ماذا بعده؟  
# After Creating Supabase — Next Steps

دليل خطوة بخطوة لربط مشروع منصة فكرة بمشروع Supabase بعد إنشائه.

لتدفق المصادقة والصلاحيات مع Supabase انظر [AUTH.md](AUTH.md).

---

## 1) أخذ القيم من لوحة Supabase

بعد إنشاء المشروع في [supabase.com](https://supabase.com):

1. افتح مشروعك من **Dashboard**.
2. من القائمة الجانبية: **Project Settings** (أيقونة الترس).
3. **API**:
   - انسخ **Project URL** → سيكون `NEXT_PUBLIC_SUPABASE_URL`
   - انسخ **anon public** key → سيكون `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Database**:
   - في **Connection string** اختر **URI**
   - انسخ الرابط واستبدل `[YOUR-PASSWORD]` بكلمة مرور المشروع
   - هذا الرابط → `DATABASE_URL` (للاستخدام مع PostgreSQL)

---

## 2) استخدام Supabase كقاعدة بيانات (اختياري)

المشروع حالياً يستخدم **SQLite** محلياً. لاستخدام قاعدة Supabase (PostgreSQL):

1. في `prisma/schema.prisma` غيّر:
   - من: `provider = "sqlite"`
   - إلى: `provider = "postgresql"`
2. في ملف `.env` ضع:
   ```env
   DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```
   (استخدم الرابط من Supabase → Database → Connection string)
3. من الطرفية:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```
   أو إذا أول مرة مع Postgres:
   ```bash
   npx prisma db push
   ```

إن أردت البقاء على SQLite محلياً واستخدام Supabase فقط في الإنتاج، اترك `provider = "sqlite"` محلياً واعمل schema منفصل أو استخدم `provider = "postgresql"` فقط عند النشر (مع `DATABASE_URL` من Supabase).

---

## 3) تفعيل مصادقة Supabase (Auth)

1. في `.env` أضف أو عدّل (يُفضّل ضبط **كلا** المتغيرين للمصادقة لضمان اتساق الـ API والـ middleware والعميل):
   ```env
   USE_SUPABASE_AUTH=true
   NEXT_PUBLIC_USE_SUPABASE_AUTH=true
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```
2. **التسجيل من الموقع (إنشاء حساب جديد):**
   - عند تفعيل Supabase Auth، نموذج **إنشاء حساب** في الموقع ينشئ المستخدم في **Supabase Auth** ثم في جدول **User** في Prisma (بنفس المعرّف). بعدها يمكن للمستخدم تسجيل الدخول مباشرة من صفحة تسجيل الدخول.
   - إن كان **تأكيد البريد** مفعّلاً في Supabase (Authentication → Providers → Email → Confirm email)، يجب على المستخدم تأكيد بريده قبل تسجيل الدخول؛ يمكن تعطيله من اللوحة للتجربة.
3. **إضافة مستخدم تجريبي يدوياً (مثلاً client@test.com):**
   - **Supabase Dashboard → Authentication → Users → Add user**
   - اختر **Create new user**
   - أدخل **Email** و **Password**
   - اضغط **Create user**
   - عند أول تسجيل دخول من الموقع يُنشأ تلقائياً سجل في جدول **User** في قاعدة البيانات (مزامنة من Supabase Auth).
4. إذا ظهرت رسالة **"Invalid login credentials"** أو خطأ 400: المستخدم غير موجود في Supabase Auth أو كلمة المرور خاطئة. أضف المستخدم من الخطوة أعلاه أو صحّح كلمة المرور.

5. **حساب مهندس (ENGINEER) وحساب أدمن (ADMIN):**
   - في **Supabase → Authentication → Users → Add user** أنشئ مستخدمين جديدين، مثلاً:
     - `engineer@test.com` + كلمة مرور
     - `admin@test.com` + كلمة مرور
   - سجّل دخولاً **مرة واحدة** من الموقع بكل حساب (حتى يُنشأ سجله في جدول User).
   - من مجلد المشروع في الطرفية نفّذ (استبدل البريد إن استخدمت بريداً مختلفاً):
     ```bash
     npx tsx scripts/set-user-role.ts engineer@test.com ENGINEER
     npx tsx scripts/set-user-role.ts admin@test.com ADMIN
     ```
   - بعدها يمكن تسجيل الدخول بنفس البريد وكلمة المرور وسيكون الحساب مهندساً أو أدمن حسب ما عيّنته.

---

## 4) تشغيل المشروع محلياً بعد الربط

```bash
npm install
npx prisma generate
# إذا استخدمت PostgreSQL:
npx prisma db push
# أو
npx prisma migrate deploy

npm run dev -- -p 3000
```

افتح [http://localhost:3000](http://localhost:3000). إذا كان المصادقة Supabase مفعّلة، استخدم مستخدمًا أنشأته من لوحة Supabase أو من التسجيل في الموقع.

---

## 5) النشر على Vercel (بعد ربط Supabase)

1. في **Vercel → Project → Settings → Environment Variables** أضف نفس المتغيرات:
   - `DATABASE_URL` (رابط Supabase PostgreSQL)
   - `NEXTAUTH_SECRET` و `NEXTAUTH_URL` (إن كنت ما زلت تستخدم NextAuth لبعض المسارات)
   - إن فعّلت Supabase Auth:
     - `USE_SUPABASE_AUTH=true`
     - `NEXT_PUBLIC_USE_SUPABASE_AUTH=true`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **Redeploy** المشروع من Vercel.
3. على قاعدة الإنتاج شغّل مرة واحدة:
   ```bash
   npx prisma migrate deploy
   ```
   (مع `DATABASE_URL` مضبوط على رابط Supabase).

---

## ملخص الترتيب

| الترتيب | الخطوة |
|--------|--------|
| 1 | إنشاء مشروع Supabase وأخذ Project URL و anon key و Database URL |
| 2 | (اختياري) تغيير Prisma إلى `postgresql` وضبط `DATABASE_URL` وتشغيل `prisma generate` و `db push` أو `migrate deploy` |
| 3 | تفعيل مصادقة Supabase في `.env` (المتغيرات الأربعة أعلاه) |
| 4 | تشغيل المشروع محلياً والتأكد من تسجيل الدخول |
| 5 | إضافة نفس المتغيرات في Vercel وإعادة النشر وتشغيل migrations على قاعدة الإنتاج |
