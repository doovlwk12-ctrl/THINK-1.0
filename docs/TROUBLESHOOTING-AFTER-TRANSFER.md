# استكشاف الأخطاء بعد نقل Supabase أو Vercel

عند ظهور **500** أو **401** على `/api/auth/me` و `/api/orders/my-orders` (مثل: "جاري التحويل لتسجيل الدخول..." ولا يكتمل التحميل)، راجع التالي.

---

## 1. متغيرات البيئة على Vercel (الأهم)

### تنبيه: الرابط الذي تفتحه يجب أن يطابق NEXTAUTH_URL
- إذا فتحت الموقع من رابط مثل `think-1-0-k86b8fdeq-fekers-projects.vercel.app` بينما NEXTAUTH_URL مضبوط على `think-1-0-khaki.vercel.app` → الجلسة لن تعمل (401).
- **الحل:** افتح الموقع دائماً من **نفس الرابط** الموجود في NEXTAUTH_URL، أو غيّر NEXTAUTH_URL على Vercel ليطابق الرابط الذي تستخدمه فعلياً.

### NEXTAUTH_URL
- **يجب أن يكون مطابقاً لرابط الموقع الذي تفتحه في المتصفح** بعد النقل.
- مثال: `https://think-1-0-khaki.vercel.app` (بدون شرطة في النهاية).
- إذا كان لا يزال يشير لرابط قديم (مثل `fekre.vercel.app`) فالجلسة لن تعمل → 401.

### NEXTAUTH_SECRET
- يجب أن يكون مضبوطاً وقوياً (32+ حرف).
- إذا غيّرته بعد النقل، المستخدمون الحاليون يحتاجون **تسجيل دخول من جديد**.

### DATABASE_URL
- **بعد نقل Supabase لحساب آخر:** لا تستخدم الرابط القديم. خذ **رابط جديد** من المشروع الحالي: Supabase Dashboard → **Settings** → **Database** → **Connection string (URI)** → **Transaction**، ثم أضف `?pgbouncer=true` وانقله إلى Vercel. استخدام الرابط القديم يسبب **500** (فشل اتصال أو مشروع متوقف).
- استخدم **منفذ 6543** و **`?pgbouncer=true`** (وضع Transaction لـ Supabase).
- صيغة مقبولة:  
  `postgres://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`  
- راجع `docs/VERCEL-DATABASE-FIX.md` للتفاصيل.

---

## 1.1 Supabase → URL Configuration و Redirect URLs

- مشروعك يستخدم **NextAuth** (وليس Supabase Auth)، لذلك تسجيل الدخول يتحكم فيه **NEXTAUTH_URL** وليس إعدادات Supabase.
- **Site URL** و **Redirect URLs** في Supabase تُستخدم عند تفعيل **Supabase Auth** لاحقاً. ما وضعته صحيح: `https://think-1-0-khaki.vercel.app` و `https://think-1-0-khaki.vercel.app/**`.
- إذا كان لديك نشرات أخرى (مثل روابط Preview في Vercel)، يمكن إضافةها في Redirect URLs، مثال: `https://*.vercel.app/**` (حسب دعم Supabase للـ wildcard).

---

## 2. بعد تغيير أي متغير

1. **Redeploy**: Deployments → آخر نشر → **Redeploy**.
2. جرّب في نافذة خاصة أو بعد مسح الكوكيز إذا استمر 401 (جلسة قديمة).

---

## 3. تسجيل الدخول من جديد

بعد نقل Vercel إلى حساب/دومين جديد:
- الدومين تغيّر → الكوكيز القديمة لا تُقبل.
- الحل: ادخل إلى `/login` وسجّل الدخول مرة أخرى.

---

## 4. التحقق من السجلات (Logs)

في Vercel: **Deployments** → اختر النشر النشط → **Functions** → اختر استدعاء لـ `api/auth/me` أو `api/orders/my-orders` وعرض الـ **Logs** لمعرفة رسالة الخطأ الفعلية (اتصال بقاعدة البيانات، مفقود env، إلخ).

---

## ملخص سريع

| الخطأ | احتمال السبب | الإجراء |
|-------|--------------|---------|
| 401 على `/api/auth/me` | NEXTAUTH_URL خاطئ أو جلسة قديمة | تصحيح NEXTAUTH_URL على Vercel + تسجيل دخول من جديد |
| 500 على `/api/auth/me` أو `/api/orders/my-orders` | فشل اتصال بقاعدة البيانات | التحقق من DATABASE_URL (6543 + pgbouncer) ثم Redeploy |
