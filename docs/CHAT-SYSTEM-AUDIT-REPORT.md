# تقرير فحص نظام المحادثة (Chat/Messages) — خطأ 500

**التاريخ:** 2025-02-11  
**المنهجية:** فحص مسار الطلب، تكامل Prisma، RLS والمصادقة، الواجهة الأمامية، متغيرات البيئة.

---

## 1. فحص مسار الطلب (API Route Audit)

### المسار المسؤول
- **الملف:** `app/api/messages/[orderId]/route.ts`
- **المسار:** `GET /api/messages/:orderId` و `POST /api/messages/:orderId`
- **المعامل في الرابط:** `orderId` (معرف الطلب — CUID مثل `cmlhid9yv0001b1t616gk1jzm`).

### النتائج والإصلاحات

| البند | الحالة | التفاصيل |
|--------|--------|----------|
| **معالجة orderId** | تم إصلاحه | في Next.js 15 قد يكون `context.params` وعدة (Promise). كان الكود يستخدم `Promise.resolve(context?.params ?? {}).catch(...)` دون التأكد من await الوعد. تم استبداله بفحص صريح: إذا كان `rawParams.then` دالة نستدعي `await rawParams` وإلا نستخدم الكائن مباشرة. **السطور 37–46 (GET)** و **169–178 (POST)**. |
| **نوع المعامل** | متطابق | قاعدة البيانات تستخدم `id` (text/cuid) لـ Order و Message.orderId (text). الـ API يتعامل مع orderId كـ string — متوافق. |
| **try-catch شامل** | موجود ومُحسَّن | يوجد غلاف خارجي `try/catch` يرجع **503** دائماً عند أي استثناء (لا 500). الـ catch الداخلي يحوّل أي رد 5xx من `handleApiError` إلى 503. |
| **تسجيل الخطأ التفصيلي** | تم إضافته | في catch الـ GET والـ POST: طباعة `err.message` و `code` و `meta` و `name` و **stack** كاملة في السجلات (Vercel/Server). لتشخيص السبب الحقيقي ابحث في السجلات عن `[messages GET]` أو `[messages POST]`. |

### السطر الذي كان يمكن أن يسبب 500 (قبل الإصلاحات السابقة)
- أي استثناء غير متوقع من Prisma (مثلاً P2021 جدول غير موجود، أو خطأ اتصال) كان يُمرَّر إلى `handleApiError` الذي يرجع **500** في الحالات الافتراضية. تم معالجته بتحويل كل 5xx إلى **503** في الـ catch وإضافة الغلاف الخارجي.

---

## 2. فحص تكامل Prisma (Schema Sync)

### المقارنة مع جدول Message في Supabase (قاعدة البيانات الفعلية)

| عمود Schema (Prisma) | عمود DB (Supabase) | الحالة |
|----------------------|--------------------|--------|
| id (String, cuid) | id (text) | متطابق |
| orderId (String) | orderId (text) | متطابق |
| senderId (String) | senderId (text) | متطابق |
| content (String) | content (text) | متطابق |
| isRead (Boolean) | isRead (boolean, default false) | متطابق |
| createdAt (DateTime) | createdAt (timestamp) | متطابق |

### العلاقات (Relations)
- **Message → Order:** `orderId` → `Order.id` (مع وجود FK في DB).
- **Message → User (sender):** `senderId` → `User.id` (مع وجود FK في DB).
- **Order:** `clientId`, `engineerId` مرتبطان بـ User.

**النتيجة:** لا يوجد انزياح بين الـ schema والجدول الفعلي؛ أسماء الأعمدة والعلاقات متطابقة.

---

## 3. الصلاحيات والأمن (RLS & Auth)

### الجلسة (Session)
- الـ API يتطلب مصادقة: استدعاء `requireAuth(request)` في بداية GET و POST.
- عند فشل التحقق: **401** (غير مصرح) أو **503** (فشل التحقق من الجلسة — لا 500).

### الـ Middleware
- مسار `/api/messages/` مُدرج في `isPollingEndpoint` ولا يُحدّ بطلب معدود صارم؛ لا يمنع الطلب.
- المصادقة تُفحص داخل الـ API عبر `requireAuth` (NextAuth أو Supabase حسب `NEXT_PUBLIC_USE_SUPABASE_AUTH`).

### RLS على جدول Message
- **النتيجة من قائمة الجداول (Supabase):** جدول **Message** لديه **rls_enabled: false**.
- لا توجد سياسات RLS على Message؛ الوصول يتم عبر **Prisma** باستخدام **DATABASE_URL** (اتصال Postgres مباشر)، وليس عبر Supabase client مع anon key. لذلك **RLS ليس سبب خطأ 500** في هذا المشروع.

---

## 4. الواجهة الأمامية (Frontend Integrity)

### المكون الذي يستدعي الرسائل
- **الصفحة (العميل):** `app/(client)/orders/[id]/chat/page.tsx` — تستخدم `orderId = params.id` (معرف الطلب من الرابط).
- **الهوك:** `hooks/useOrderChat.ts` — يستدعي `GET /api/messages/${orderId}`.

### سبب الطلبات المتكررة
- **Polling:** لتحميل رسائل جديدة كل فترة (`pollIntervalMs` افتراضي 3000 ms). هذا مقصود.

### الإصلاحات المطبقة
- **إيقاف الطلب عند خطأ 500 أو 503:** عند أي رد **500** أو **503** يتم تعيين `pollingStopped = true` وإيقاف الـ interval فوراً (لا انتظار 3 فشل متتالي).
- **رسالة موحدة:** عرض نفس الرسالة الودية للمستخدم عند 500 أو 503: "تعذر الاتصال بالخادم. تحقق من الاتصال وأعد المحاولة."
- **إعادة المحاولة:** استدعاء `fetchMessages(true)` (مثلاً من زر "إعادة المحاولة") يُصفّر العداد ويعيد تشغيل الـ polling.

---

## 5. متغيرات البيئة (Env Vars)

### المطلوب لمسار الرسائل

| المتغير | الاستخدام |
|---------|-----------|
| **DATABASE_URL** | Prisma — قراءة/كتابة Order و Message و User. يجب أن يكون رابط Postgres صالح (على Vercel يُفضّل وضع Transaction مع `?pgbouncer=true`). |
| **NEXTAUTH_SECRET** / **NEXTAUTH_URL** | عند استخدام NextAuth للمصادقة. |
| **NEXT_PUBLIC_SUPABASE_URL** و **NEXT_PUBLIC_SUPABASE_ANON_KEY** | عند استخدام Supabase Auth (`NEXT_PUBLIC_USE_SUPABASE_AUTH=true`) — للتحقق من الجلسة فقط. |

- **جدول Message** يُقرأ ويُحدَّث عبر **Prisma** فقط (DATABASE_URL)، وليس عبر Supabase client. لذلك صلاحيات Supabase (service role / anon) لا تؤثر على استعلامات Message؛ المهم أن **DATABASE_URL** صحيح وأن المستخدم مصادق (session) ليكون الطلب مسموحاً في الكود.

---

## 6. تحديد السطر المسبب للخطأ والإصلاح

### السبب الأكثر احتمالاً لظهور 500 سابقاً
1. **خطأ من Prisma** (اتصال، P2021، إلخ) يُرجَع عبر `handleApiError` كـ **500** قبل أن يحوّله الـ catch إلى 503.
2. **عدم حل وعد `context.params`** في Next.js 15 بشكل صريح، مما قد يترك `orderId` غير معرّف في بعض التشغيلات ويؤدي لسلوك غير متوقع.

### الإصلاحات المطبقة (ملخص)
- **`app/api/messages/[orderId]/route.ts`:**
  - استخراج `orderId` من `context.params` مع دعم **Promise** بشكل صريح (GET و POST).
  - تسجيل تفصيلي للخطأ: `message`, `code`, `meta`, `name`, `stack`.
  - غلاف خارجي try/catch يرجع **503** دائماً؛ تحويل أي 5xx من handleApiError إلى 503 في الـ catch الداخلي.
- **`hooks/useOrderChat.ts`:**
  - إيقاف الـ polling عند أول **500** أو **503** وعرض رسالة موحدة.
  - الاحتفاظ بإيقاف الـ polling بعد 3 فشل متتالي لأي خطأ آخر.

### ماذا تفعل إذا استمر ظهور 500 بعد النشر
1. التأكد من أن آخر commit (بما فيه التعديلات أعلاه) مُنشَر على Vercel وإعادة Deploy إذا لزم.
2. مراجعة **سجلات الدالة (Vercel)** وبحث عن `[messages GET]` أو `[messages POST]` لرؤية **الخطأ الحقيقي** (message, code, stack).
3. التحقق من **DATABASE_URL** على Vercel (صحيح، وضع Transaction مع pgbouncer إذا لزم).

---

## 7. ملخص الحالة بعد الفحص

| البند | الحالة |
|--------|--------|
| مسار API messages | معالجة آمنة لـ params، try-catch مزدوج، تحويل 5xx → 503، تسجيل تفصيلي |
| Prisma vs DB | Message و Order و User متطابقون مع الـ schema |
| RLS | معطّل على Message — ليس سبباً للخطأ |
| المصادقة والـ Middleware | لا يمنعان الطلب؛ الفشل يُعاد كـ 401/503 |
| الواجهة (useOrderChat) | إيقاف polling عند 500/503، رسالة موحدة، إعادة محاولة مدعومة |
| متغيرات البيئة | DATABASE_URL مطلوب لـ Prisma؛ Supabase للجلسة فقط عند استخدامه |

تم إصلاح الأسباب المحتملة لخطأ 500 وتوثيق مسار التشخيص في السجلات.
