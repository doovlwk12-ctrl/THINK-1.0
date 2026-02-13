# إصلاح خطأ "تعذر الاتصال بقاعدة البيانات" على Vercel

## السبب
التطبيق على Vercel لا يستطيع الاتصال بقاعدة بيانات PostgreSQL (Supabase). الخطأ يظهر عند تسجيل الدخول لأن NextAuth يتحقق من المستخدم عبر Prisma.

## الحل: التحقق من DATABASE_URL في Vercel

### 1. الشكل الصحيح للرابط

لـ **Vercel + Supabase** يجب استخدام **Transaction Pooler** (المنفذ 6543) مع `?pgbouncer=true`:

```
postgres://postgres:[كلمة_المرور]@db.[معرف_المشروع].supabase.co:6543/postgres?pgbouncer=true
```

**مهم:**
- استخدم المنفذ **6543** (وليس 5432)
- يجب أن ينتهي الرابط بـ **`?pgbouncer=true`** (كامل، وليس `pgbouncer=` فقط)
- إذا كانت كلمة المرور تحتوي على رموز خاصة (`@`, `#`, `%` إلخ)، قم بترميزها (URL encode)

### 2. أين تجد القيم من Supabase؟

1. افتح [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. اذهب إلى **Project Settings** → **Database**
4. في قسم **Connection string** اختر **URI**
5. اختر **Transaction** (وليس Session أو Direct)
6. انسخ الرابط ثم:
   - تأكد أن المنفذ **6543**
   - أضف `?pgbouncer=true` في النهاية إذا لم يكن موجوداً

### 3. التحقق في Vercel

1. Vercel Dashboard → مشروعك → **Settings** → **Environment Variables**
2. تحقق من `DATABASE_URL`:
   - القيمة غير فارغة
   - تنتهي بـ `?pgbouncer=true`
   - كلمة المرور صحيحة (يمكن تغييرها من Supabase → Settings → Database → Reset database password)

### 4. إعادة النشر

بعد تعديل `DATABASE_URL` في Vercel:
- اذهب إلى **Deployments** → اختر آخر نشر → **Redeploy**
- أو ادفع commit جديد إلى GitHub

### 5. فحص إضافي

- تأكد أن مشروع Supabase **غير متوقف** (مشاريع Free تتوقف بعد عدم نشاط)
- جرّب `/api/system/health?secret=HEALTH_CHECK_SECRET` للتحقق من صحة الاتصال
