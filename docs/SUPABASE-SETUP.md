# إعداد Supabase للمشروع

هذا الملف مرجع لإعداد Supabase (مصادقة، تخزين) عند الرغبة باستخدامه بدل التشغيل المحلي فقط.

---

## 1. متغيرات البيئة (.env)

أضف أو فعّل في `.env`:

| المتغير | القيمة | المصدر |
|---------|--------|--------|
| `USE_SUPABASE_AUTH` | `true` | تفعيل مصادقة Supabase |
| `NEXT_PUBLIC_USE_SUPABASE_AUTH` | `true` | مطلوب للواجهة والـ middleware |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | لوحة Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `...` | نفس الصفحة → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | `...` | نفس الصفحة → service_role (سري، لا يظهر في العميل) |

للقاعدة السحابية (اختياري، بدل Postgres المحلي):

- `DATABASE_URL` من Supabase → Project Settings → Database → Connection string (URI). للإنتاج أضف `?sslmode=require`؛ مع Connection pooling استخدم Transaction mode و `?pgbouncer=true` إن لزم.
- المشروع يستخدم **PostgreSQL** فقط؛ غيّر فقط قيمة `DATABASE_URL` للتبديل بين محلي و Supabase. للتفاصيل راجع **[SUPABASE-DATABASE.md](./SUPABASE-DATABASE.md)**.

---

## 2. المصادقة (Auth)

من لوحة Supabase:

- **Authentication → URL Configuration**
  - **Site URL:** عنوان الموقع (مثلاً `http://localhost:3000` للتطوير أو `https://your-domain.com` للإنتاج).
  - **Redirect URLs:** أضف المسارات المستخدمة، مثلاً:
    - `http://localhost:3000`
    - `http://localhost:3000/login`
    - `http://localhost:3000/reset-password`
    - ونطاق الإنتاج إن لزم.

- **Authentication → Email:** إن أردت تسجيل دخول دون تأكيد بريد، فعّل خيار عدم طلب تأكيد البريد.

---

## 3. التخزين (Storage) — bucket "orders"

يُستخدم لتخزين ملفات الطلبات/المخططات المرفوعة من المهندس. عند تفعيل Supabase (وجود `SUPABASE_SERVICE_ROLE_KEY` و `NEXT_PUBLIC_SUPABASE_URL`) يرفع التطبيق الملفات إلى bucket باسم **orders**.

- من **Storage → Buckets** أنشئ أو استخدم bucket باسم **orders** (وهو الاسم المعتمد في الكود).
- **File size limit:** 10 MB (مطابق لحد الرفع في التطبيق).
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/jpg`, `application/pdf` (أو Any).
- **Policies:** إن كان الرفع والتحميل من السيرفر فقط عبر Service Role، يمكن عدم إضافة سياسات. لتفعيل RLS أضف سياسات من **Storage → Policies** حسب الصلاحيات المطلوبة.

---

## 4. بعد التعديل

- أوقف خادم التطوير (Ctrl+C).
- احذف مجلد `.next` ثم شغّل من جديد: `npm run dev`.
- تأكد أن مشروع Supabase **نشط** (غير Paused) وإلا ستظهر أخطاء اتصال أو ENOTFOUND.

---

## 5. العودة للتشغيل المحلي فقط

- في `.env`: ضع `NEXT_PUBLIC_USE_SUPABASE_AUTH=false` و `USE_SUPABASE_AUTH=false`.
- علّق أو احذف متغيرات Supabase الأخرى إن لم تكن تحتاجها.
- أعد تشغيل التطبيق بعد حذف `.next`.

راجع [مشروع_محلي_وقف_المنصات.md](../مشروع_محلي_وقف_المنصات.md) للتفاصيل.
