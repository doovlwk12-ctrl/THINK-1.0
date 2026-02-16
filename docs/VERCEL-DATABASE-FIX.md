# إصلاح خطأ "تعذر الاتصال بقاعدة البيانات" على Vercel

## الأسباب الشائعة

1. **فشل الاتصال أو المصادقة:** رابط خاطئ أو كلمة مرور غير صحيحة.
2. **بطء الصفحات و 503 و "Timed out fetching a new connection":** استنفاد الاتصالات أو عدم استخدام مجمّع الاتصالات (Pooler). في لوقات Vercel تظهر رسائل مثل:
   - `prisma:error Invalid prisma.* invocation: Timed out fetching a new connection`
   - عندها الطلبات تفشل (503) والصفحات تبطئ أو لا تُحمّل البيانات.

## الحل: التحقق من DATABASE_URL في Vercel

### 1. الشكل الصحيح للرابط

لـ **Vercel + Supabase** يجب استخدام **Transaction Pooler** (المنفذ 6543) مع `?pgbouncer=true`، ويُفضّل إضافة **`&connection_limit=1`** لتفادي استنفاد الاتصالات ووقت الانتظار:

```
postgres://postgres.[معرف_المشروع]:[كلمة_المرور]@aws-0-[منطقة].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

أو بالشكل القديم (إن كان مشروعك يستخدمه):

```
postgres://postgres:[كلمة_المرور]@db.[معرف_المشروع].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
```

**مهم:**
- استخدم المنفذ **6543** (وليس 5432).
- يجب أن يحتوي الرابط على **`?pgbouncer=true`**.
- **أضف `&connection_limit=1`** في النهاية حتى لا يفتح كل استدعاء سيرفرلس اتصالات كثيرة (هذا يقلل "Timed out fetching a new connection" و 503).
- إذا كانت كلمة المرور تحتوي على رموز خاصة (`@`, `#`, `%` إلخ)، قم بترميزها (URL encode).

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

---

## بطء الصفحات + 503 + "Timed out fetching a new connection"

**السبب:** في بيئة Vercel السيرفرلس، كل استدعاء قد يفتح اتصالاً جديداً بقاعدة البيانات. بدون استخدام **Pooler** (منفذ 6543 و `pgbouncer=true`) وبدون **`connection_limit=1`**، يزداد عدد الاتصالات أو يطول انتظار اتصال جديد فيظهر "Timed out fetching a new connection" وتفشل الطلبات (503) وتصبح الصفحات بطيئة أو لا تُحمّل الإحصائيات/الإشعارات.

**الحل:**
1. استخدم رابط **Transaction** من Supabase (منفذ 6543).
2. أضف في نهاية الرابط: **`?pgbouncer=true&connection_limit=1`**.
3. ضع الرابط في **Environment Variables** في Vercel تحت اسم **DATABASE_URL**.
4. نفّذ **Redeploy** بعد التعديل.
