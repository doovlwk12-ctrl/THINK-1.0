# استكشاف الأخطاء وحلها — تفادي الإشكاليات الشائعة ومعالجتها

هذه الوثيقة مرجع واحد يجمع **الإشكاليات المعروفة** في المشروع مع طرق **التفادي** (قبل النشر أو عند الإعداد) و**الحل** (عند حدوث المشكلة). للتفاصيل الكاملة راجع الوثائق المربوطة في كل قسم.

---

## 1. خطأ 503 — تعذر الاتصال بقاعدة البيانات

### الأعراض

- رسالة "تعذر الاتصال بقاعدة البيانات. يرجى المحاولة لاحقاً" أو استجابة **503 Service Unavailable**.
- يظهر عند استدعاء مسارات تستخدم قاعدة البيانات مثل `/api/orders/my-orders` أو `/api/packages` أو لوحة التحكم بعد تسجيل الدخول.
- في سجلات Vercel قد تظهر أخطاء اتصال بقاعدة البيانات.

### السبب

استخدام رابط الاتصال **المباشر** (Direct، منفذ 5432) في `DATABASE_URL` بدل رابط **الـ Pooler** (وضع Transaction، منفذ 6543). على Vercel (Serverless) الاتصال المباشر يستهلك عدد اتصالات كبير ويؤدي إلى فشل الطلبات.

### كيفية التفادي

- من **أول نشر** استخدم رابط الاتصال عبر الـ Pooler:
  - من **Supabase Dashboard** → **Project Settings** → **Database** (أو **Connect**): اختر **Connection string** ثم **Transaction**.
  - انسخ الرابط (منفذ 6543) وأضف في **نهاية الرابط**: `?pgbouncer=true`.
  - ضع هذا الرابط في متغير `DATABASE_URL` في **Vercel → Project → Settings → Environment Variables** قبل أو أثناء أول Deploy.
- راجع [docs/DEPLOYMENT.md](DEPLOYMENT.md) (الخطوة 3 وقسم "إصلاح خطأ 503").

### كيفية الحل

1. من **Supabase Dashboard** → **Project Settings** → **Database** (أو **Connect**) اختر **Connection string** ثم **Transaction**.
2. انسخ الرابط بالشكل: `postgres://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:6543/postgres`.
3. أضف في النهاية: `?pgbouncer=true` (مثال: `...6543/postgres?pgbouncer=true`).
4. من **Vercel** → **Project** → **Settings** → **Environment Variables** عدّل `DATABASE_URL` إلى هذا الرابط.
5. من **Deployments** اختر آخر نشر ثم **⋯ → Redeploy** حتى تُحمّل القيمة الجديدة.

بعد التعديل يجب أن تختفي أخطاء 503 المرتبطة بقاعدة البيانات.

### مراجع

- [docs/DEPLOYMENT.md](DEPLOYMENT.md) — الخطوة 3، وقسم "إصلاح خطأ 503"، وجدول متغيرات البيئة.

---

## 2. خطأ 429 — Too Many Requests

### الأعراض

- استجابة **429** مع رسالة مثل "تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً".
- يظهر غالباً عند تسجيل الدخول أو التسجيل أو نسيت كلمة المرور أو عند تكرار طلبات الـ API بسرعة.

### السبب

تفعيل **Rate Limiting** في الـ middleware على مسارات المصادقة والـ API؛ تجاوز الحد المسموح يُرجع 429.

### كيفية التفادي

- الكود الحالي يستثني مسارات تُستدعى كثيراً (مثل `/api/auth/session` و `/api/auth/_log`) ومسارات الـ polling (المحادثات، الإشعارات، الطلبات، الباقات) من الحد الصارم، فلا تُقييد تسجيل الدخول العادي.
- تجنّب إزالة أو تشديد حدود الطلبات على `/api/auth/session` و `/api/auth/_log` لأن NextAuth يستدعيهما بشكل متكرر.
- راجع [middleware.ts](../middleware.ts) لدالة `isStrictAuthPath` و `isPollingEndpoint`.

### كيفية الحل

- إن ظهر 429 أثناء التطوير: انتظر حتى يُعاد تعيين العداد (راجع هيدر `Retry-After` أو `X-RateLimit-Reset` في الاستجابة).
- إن ظهر 429 في الإنتاج للمستخدمين العاديين: تحقق من أن الإصدار المنشور يتضمن استثناء `/api/auth/session` و `/api/auth/_log` ومسارات الـ polling في الـ middleware؛ إن كان قديماً، انشر من أحدث commit (راجع الإشكالية 5).

### مراجع

- [middleware.ts](../middleware.ts) — دوال `isStrictAuthPath` و `runRateLimit` و `isPollingEndpoint`.

---

## 3. خطأ 405 — Method Not Allowed على `/api/messages/send` أو `/api/plans/send`

### الأعراض

- استجابة **405 Method Not Allowed** عند طلب GET أو HEAD إلى `/api/messages/send` أو `/api/plans/send`.
- قد يحدث بسبب كاش المتصفح أو prefetch أو روابط قديمة توجه إلى هذه المسارات بطلب GET.

### السبب

هذه المسارات مصممة لـ **POST** فقط (إرسال رسالة أو إرسال مخطط). طلبات GET/HEAD من كاش أو prefetch لا تجد معالجاً فتُرجع 405.

### كيفية التفادي

- الكود الحالي يضيف معالجات **GET** و **HEAD** و **OPTIONS** لـ `/api/messages/send` و `/api/plans/send` لتعيد استجابة آمنة (مثل 200/204) بدل 405، فلا تؤثر على المستخدم.
- تأكد من أن الواجهة تستخدم **POST** إلى المسار الصحيح لإرسال الرسائل: `POST /api/messages/:orderId` (وليس `/api/messages/send`). راجع [docs/ORDER-WORKFLOW.md](ORDER-WORKFLOW.md) والـ API ذات الصلة.

### كيفية الحل

- إن ظهر 405 للمستخدم: تأكد من أن الإصدار المنشور يحتوي على معالجات GET/HEAD/OPTIONS في:
  - [app/api/messages/send/route.ts](../app/api/messages/send/route.ts)
  - [app/api/plans/send/route.ts](../app/api/plans/send/route.ts)
- إن كان النشر من commit قديم، انشر من أحدث `main` (راجع الإشكالية 5).

### مراجع

- [app/api/messages/send/route.ts](../app/api/messages/send/route.ts) — معالجات GET/HEAD/OPTIONS.
- [app/api/plans/send/route.ts](../app/api/plans/send/route.ts) — نفس الفكرة.
- [docs/ORDER-WORKFLOW.md](ORDER-WORKFLOW.md) — سير المحادثة وإرسال المخططات.

---

## 4. خطأ 500 على `/api/plans/upload` (أو 503 مع رسالة واضحة)

### الأعراض

- **500** أو **503** عند رفع ملف/صورة من لوحة المهندس ("رفع مخطط").
- في بيئة Vercel قد تظهر رسالة عربية توضّح أن التخزين السحابي غير مُعد (يجب إعداد S3 أو Cloudinary).

### السبب

على **Vercel** نظام الملفات **read-only**؛ التخزين المحلي (كتابة إلى `public/uploads`) غير متاح. بدون إعداد S3 أو Cloudinary يفشل الرفع.

### كيفية التفادي

- قبل تفعيل "رفع مخطط" في الإنتاج على Vercel: إعداد تخزين سحابي واحد على الأقل:
  - **S3:** ضبط `AWS_S3_BUCKET`، `AWS_ACCESS_KEY_ID`، `AWS_SECRET_ACCESS_KEY` (وروابط المنطقة إن لزم) في متغيرات البيئة على Vercel.
  - **Cloudinary:** ضبط `CLOUDINARY_CLOUD_NAME`، `CLOUDINARY_API_KEY`، `CLOUDINARY_API_SECRET` في متغيرات البيئة على Vercel.
- راجع [docs/DEPLOYMENT.md](DEPLOYMENT.md) و [lib/storage.ts](../lib/storage.ts) للشروط.

### كيفية الحل

1. إن أردت تفعيل الرفع على Vercel: أضف متغيرات أحد الخيارين (S3 أو Cloudinary) في **Vercel → Project → Settings → Environment Variables** ثم **Redeploy**.
2. إن لم تُضبط التخزين السحابي: الكود الحالي يُرجع **503** مع رسالة عربية واضحة بدل 500، فيفهم المستخدم أن الرفع غير متاح حتى إعداد التخزين.

### مراجع

- [lib/storage.ts](../lib/storage.ts) — شرط `VERCEL` و `STORAGE_NOT_CONFIGURED_MESSAGE`، ودعم S3/Cloudinary.
- [app/api/plans/upload/route.ts](../app/api/plans/upload/route.ts) — معالجة خطأ التخزين غير المُعد وإرجاع 503.

---

## 5. بناء Vercel من commit قديم

### الأعراض

- سجل البناء على Vercel يظهر **Commit: xxxxx** قديم، بينما الفرع `main` على GitHub يحتوي على commits أحدث.
- النشر يعكس كوداً قديماً (إصلاحات أو ميزات جديدة غير ظاهرة).

### السبب

- استخدام زر **"Redeploy"** على **نشر قديم** يعيد بناء **نفس الـ commit** المرتبط بذلك النشر ولا يجلب أحدث كود من `main`.
- أو إعداد Git في Vercel (فرع الإنتاج أو المستودع) غير مضبوط.

### كيفية التفادي

- عند الرغبة في نشر **أحدث كود**: لا تعتمد على "Redeploy" لنشر قديم؛ دفع **commit جديد** إلى `main` (مثلاً `git push origin main`) ليُطلق نشراً تلقائياً من أحدث commit.
- تأكد من **Vercel → Settings → Git** أن **Production Branch** = `main` وأن المستودع المرتبط صحيح.

### كيفية الحل

1. **التأكد من أن GitHub فيه أحدث الكود:**  
   `git fetch origin` ثم `git log origin/main --oneline -5`، وإن لزم `git push origin main`.
2. **التحقق من إعدادات Git في Vercel:** Settings → Git، Production Branch = `main`، المستودع صحيح.
3. **إطلاق نشر من أحدث commit:**  
   دفع commit جديد (مثلاً `git commit --allow-empty -m "chore: trigger Vercel deploy"` ثم `git push origin main`) وانتظار ظهور **نشر جديد** في Deployments (الأعلى في القائمة).
4. **التأكد:** في آخر Deployment تحقق من أن **Commit** هو الأحدث وليس الـ hash القديم.

### مراجع

- [docs/VERCEL-BUILD-OLD-COMMIT.md](VERCEL-BUILD-OLD-COMMIT.md) — خطة الحل الكاملة والخطوات المفصّلة.

---

## قائمة تحقق سريعة قبل النشر

- [ ] **قاعدة البيانات:** استخدام `DATABASE_URL` عبر Supabase **Transaction** (منفذ 6543) مع `?pgbouncer=true` في النهاية.
- [ ] **متغيرات البيئة:** تعبئة `NEXTAUTH_SECRET`، `NEXTAUTH_URL`، وإذا Supabase: `USE_SUPABASE_AUTH`، `NEXT_PUBLIC_USE_SUPABASE_AUTH`، `NEXT_PUBLIC_SUPABASE_URL`، `NEXT_PUBLIC_SUPABASE_ANON_KEY` (راجع [docs/DEPLOYMENT.md](DEPLOYMENT.md)).
- [ ] **Supabase Auth:** ضبط **Site URL** و **Redirect URLs** (بما فيها `/reset-password`) في Authentication → URL Configuration.
- [ ] **الرفع (اختياري):** إن أردت رفع المخططات على Vercel، إعداد S3 أو Cloudinary في متغيرات البيئة.
- [ ] **النشر من أحدث كود:** بعد تعديلات محلية، دفع إلى `main` وانتظار نشر تلقائي جديد بدل الاعتماد على Redeploy لنشر قديم.

للتحقق الكامل من النشر وسير العمل (E2E) راجع [docs/VERIFICATION-CHECKLIST.md](VERIFICATION-CHECKLIST.md).
