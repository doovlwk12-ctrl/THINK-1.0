# تحليل سير عمل المصادقة والمنصة

## نظرة عامة

هذا المستند يوضح سير العمل الكامل: **قبل التسجيل**، **أثناء إنشاء الحساب وتسجيل الدخول**، و**بعد التسجيل** (لجميع الأدوار: عميل، مهندس، أدمن)، مع **تسجيل الخروج**.

المنصة تدعم مصادقتين حسب المتغير `NEXT_PUBLIC_USE_SUPABASE_AUTH`:
- **NextAuth** (قيمته غير `true`): جلسة JWT، الصلاحيات من token في الـ middleware.
- **Supabase Auth** (`true`): جلسة من الكوكيز، الصلاحيات من جدول User عبر `/api/auth/me`.

---

## 1. قبل التسجيل (زائر غير مسجل)

### المسارات المسموح بها بدون تسجيل دخول

| المسار | الوصف |
|-------|--------|
| `/` | الصفحة الرئيسية |
| `/login` | تسجيل الدخول |
| `/register` | إنشاء حساب |
| `/forgot-password` | نسيت كلمة المرور |
| `/forgot-email` | نسيت البريد الإلكتروني |
| `/reset-password` | تعيين كلمة مرور جديدة (بعد الرابط) |
| `/engineer/apply/[token]` | صفحة تقديم المهندس برابط الدعوة |

المصدر الموحد: [`lib/routes.ts`](lib/routes.ts) — الدالة `isPublicPath(path)`.

### سلوك الـ Middleware

- **NextAuth:** المسارات أعلاه لا تتطلب توكن؛ أي طلب آخر يتطلب تسجيل دخول ويُوجّه إلى `/login`.
- **Supabase:** نفس القائمة عامة؛ أي مسار غير عام يُوجّه إلى `/login` إذا لم توجد جلسة.

### واجهة الزائر

- الهيدر يعرض: اللوغو، روابط (الرئيسية، الباقات، الأسئلة الشائعة)، أزرار **تسجيل الدخول** و**إنشاء حساب**.
- الصفحة الرئيسية تعرض محتوى تسويقي وزر "ابدأ تصميمك الآن" يوجّه إلى الباقات أو إنشاء الطلب بعد التسجيل.

---

## 2. إنشاء حساب (التسجيل)

### الطلب

- **صفحة:** `/register`
- **API:** `POST /api/auth/register`
- **Body:** `{ name, email, phone, password }`
- التحقق: Zod في الواجهة، نفس الـ schema في الـ API.

### سير العمل في الـ API

1. التحقق من عدم وجود مستخدم بنفس البريد أو الجوال (Prisma).
2. **إذا Supabase Auth:**
   - إنشاء مستخدم في Supabase (`signUp`) مع `user_metadata` (name, phone).
   - إنشاء سجل في جدول `User` في Prisma بنفس `id` و role `CLIENT`.
3. **إذا NextAuth فقط:**
   - إنشاء سجل في `User` مع كلمة مرور مشفرة (bcrypt) و role `CLIENT`.
   - إرجاع `{ success: true, user }`.

### بعد نجاح التسجيل (الواجهة) — سلوك موحّد

في **كلا النظامين** (Supabase و NextAuth):

1. بعد نجاح `POST /api/auth/register` تُستدعى **تسجيل الدخول تلقائياً** `signIn(email, password)`.
2. إن نجح تسجيل الدخول: تُحدَّد اللوحة حسب الدور (من `result.user?.role` أو `getSession()` لـ NextAuth) ويتم التوجيه فوراً:
   - عميل → `/dashboard`
   - مهندس → `/engineer/dashboard`
   - أدمن → `/admin/dashboard`
3. إن فشل تسجيل الدخول (مثلاً خطأ شبكة): تُعرض رسالة الخطأ ويُوجّه المستخدم إلى `/login` لإعادة المحاولة.

النتيجة: **عندما ينشئ عميل حساباً من المنصة يُسجّل في المنصة ويسجّل الدخول دون مشاكل** ويصل إلى لوحة التحكم مباشرة.

### حماية المسارات

- `/register` و `POST /api/auth/register` **عامان** (لا يتطلبان تسجيل دخول).
- إذا كان المستخدم مسجلاً بالفعل وفتح `/register`:
  - **Supabase middleware:** يُوجّه إلى `/dashboard` (ثم لوحة العميل تُوجّه المهندس/الأدمن للوحة المناسبة).
  - **NextAuth:** الصفحة نفسها تعرض "جاري التحويل للوحة التحكم" وتوجّه حسب الدور (useEffect مع session).

---

## 3. تسجيل الدخول

### الطلب

- **صفحة:** `/login`
- **NextAuth:** `signIn('credentials', { email, password, redirect: false })`.
- **Supabase:** `supabase.auth.signInWithPassword({ email, password })` ثم `fetchMe()`.

### سير العمل

1. المستخدم يدخل البريد وكلمة المرور.
2. **NextAuth:** التحقق من Prisma (البريد + bcrypt لكلمة المرور)، إنشاء JWT يحتوي `id` و `role`، إرجاع `{ ok: true }` (الواجهة قد تستدعي `getSession()` للحصول على الدور للتوجيه).
3. **Supabase:** التحقق من Supabase، كتابة الجلسة في الكوكيز، ثم استدعاء `/api/auth/me` (الذي يقرأ الجلسة من الطلب ويجلب الدور من Prisma) وإرجاع `{ ok: true, user: { id, name, email, role } }`.

### التوجيه بعد تسجيل الدخول

| الدور | المسار |
|-------|--------|
| CLIENT | `/dashboard` |
| ENGINEER | `/engineer/dashboard` |
| ADMIN | `/admin/dashboard` |

يتم التوجيه من صفحة تسجيل الدخول (باستخدام `result.user?.role` أو `getSession()` لـ NextAuth)، مع إعادة تحميل كاملة (`window.location.href`) لضمان تطبيق الجلسة والكوكيز.

### مستخدم مسجل يفتح /login

- **Supabase:** الـ middleware يوجّهه إلى `/dashboard`.
- **NextAuth:** الصفحة تعتمد على `useEffect` مع `session` وتوجّهه حسب الدور إلى اللوحة المناسبة.

---

## 4. بعد التسجيل (المستخدم المسجل)

### لوحات التحكم حسب الدور

| الدور | المسار | الحماية |
|-------|--------|---------|
| CLIENT | `/dashboard`, `/orders/*`, `/dashboard/profile` | Middleware + تحقق الصفحة من `session.user.role` |
| ENGINEER | `/engineer/dashboard`, `/engineer/orders/*` | Middleware (NextAuth) أو الصفحة (Supabase) |
| ADMIN | `/admin/dashboard`, `/admin/*` | Middleware (NextAuth) أو الصفحة (Supabase) |

### قواعد التوجيه في الصفحات

- **لوحة العميل** (`/dashboard`): إذا `role === 'ENGINEER'` أو `'ADMIN'` → `router.replace` إلى `/engineer/dashboard` أو `/admin/dashboard`.
- **لوحة المهندس** (`/engineer/dashboard`): إذا الدور ليس ENGINEER ولا ADMIN → `router.push('/dashboard')`.
- **لوحة الإدارة** (`/admin/dashboard`): إذا الدور ليس ADMIN → `router.push('/dashboard')`.

### قواعد الـ Middleware (NextAuth فقط)

- `/admin/*` و token.role !== 'ADMIN' → توجيه إلى `/dashboard`.
- `/engineer/*` (ما عدا `/engineer/apply/`) و token.role ليس ENGINEER ولا ADMIN → توجيه إلى `/dashboard`.
- `/orders/*` و token.role === 'ENGINEER' → توجيه إلى `/engineer/dashboard`.

مع **Supabase** لا يتوفر الدور في الـ middleware (Edge لا يدعم Prisma)، لذلك الاعتماد على التحقق في الصفحات وواجهات الـ API.

### واجهة المستخدم المسجل

- الهيدر يعرض: اللوغو، التنقل، زر لوحة التحكم (حسب الدور)، إشعارات، قائمة المستخدم (ملف شخصي، إعدادات، تبديل النمط، تسجيل الخروج).

---

## 5. تسجيل الخروج

### التنفيذ

- **NextAuth:** `signOut({ callbackUrl: '/login' })` من `next-auth/react`؛ يُنظّف الجلسة ويوجّه إلى `/login`.
- **Supabase:** `supabase.auth.signOut()` ثم `setData(null)` و `router.push('/login')`.

في كلا النظامين يتم التوجيه إلى `/login` بعد تسجيل الخروج.

### مكان الاستدعاء

- قائمة المستخدم في الهيدر (زر "تسجيل الخروج") تستخدم `signOut` من `useAuth()`، والذي يمرّر إلى `UserMenu` كـ `onSignOut` عند Supabase أو يستخدم `signOut` من NextAuth.

---

## 6. استجابة الأخطاء في الـ API

جميع المسارات المحمية تعتمد على [lib/requireAuth.ts](../lib/requireAuth.ts):

| الحالة | HTTP | الجسم |
|--------|------|--------|
| غير مسجّل دخول | 401 | `{ "error": "غير مصرح - يرجى تسجيل الدخول" }` |
| مسجّل لكن دون صلاحية | 403 | `{ "error": "غير مصرح - لا توجد صلاحية كافية" }` |

---

## 7. ملخص المسارات والـ API

### مسارات عامة (بدون مصادقة)

- الصفحات: `/`, `/login`, `/register`, `/forgot-password`, `/forgot-email`, `/reset-password`, `/engineer/apply/[token]`.
- API: `/api/auth/register`, `/api/auth/forgot-email`, `/api/packages`, `/api/content/homepage`, `/api/engineer/applications/*`.

### مسارات محمية (بمصادقة ودور)

- **أدمن فقط:** `/admin/*`, `/api/admin/*` — استخدام `requireAdmin(request)` في الـ API.
- **مهندس أو أدمن:** `/engineer/*` (ما عدا apply), `/api/engineer/*` — استخدام `requireEngineerOrAdmin(request)`.
- **عميل فقط:** إنشاء طلب، إنهاء طلب، شراء تمديد/تعديلات — استخدام `requireClient(request)`.
- **أي مستخدم مسجل:** `/api/auth/me`، الطلبات، المحادثات، الإشعارات، الملف الشخصي — استخدام `requireAuth(request)`.

---

## 8. التحقق من عمل المنصة

### قائمة تحقق سريعة

- [ ] زائر يفتح `/` ويرى الصفحة الرئيسية وأزرار تسجيل الدخول/إنشاء حساب.
- [ ] زائر يفتح `/register` وينشئ حساباً ثم **يُسجّل دخوله تلقائياً ويُوجّه للوحة** (Supabase و NextAuth).
- [ ] زائر يسجل الدخول من `/login` ويُوجّه حسب الدور (عميل/مهندس/أدمن).
- [ ] عميل مسجل لا يصل لمحتوى `/admin/*` أو يُوجّه لـ `/dashboard`.
- [ ] مهندس/أدمن لا يرى لوحة العميل كمستهدف نهائي (يُوجّه للوحة المهندس/الأدمن).
- [ ] تسجيل الخروج يُوجّه إلى `/login` وتنظيف الجلسة.
- [ ] مستخدم مسجل يفتح `/login` أو `/register` يُوجّه للوحة المناسبة (أو `/dashboard` ثم الصفحة تصحح المسار).

لخطوات اختبار يدوي مفصّلة (الخطوة، الرابط، المتوقّع) راجع [MANUAL-AUTH-TESTING.md](MANUAL-AUTH-TESTING.md).

---

## 9. تحسينات مطبّقة وسجل التغييرات

| التاريخ | التحسين |
|---------|---------|
| 2026-02 | **توحيد سلوك ما بعد التسجيل:** بعد إنشاء الحساب يتم تسجيل الدخول تلقائياً (Supabase و NextAuth) والتوجيه حسب الدور؛ عند فشل تسجيل الدخول يُوجّه إلى `/login`. |
| 2026-02 | **تسجيل الدخول:** استخدام `getSession()` لـ NextAuth عند عدم وجود `result.user` لضمان التوجيه الصحيح حسب الدور. |
| 2026-02 | إضافة قسم "استجابة الأخطاء" وترقيم الأقسام (6–9). |

---

**آخر تحديث:** 4 فبراير 2026
