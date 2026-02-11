# تقرير تحليل Backend والأمن السيبراني — منصة فكرة

تقرير تحليلي يركز على قاعدة البيانات (Prisma/PostgreSQL)، التطبيع، الأداء، الأمان، ونظام المصادقة/الصلاحيات (NextAuth + Supabase)، مع قائمة ثغرات محتملة ومقترحات تحسين.

---

## 1. تحليل قاعدة البيانات (Database Analysis)

### 1.1 قائمة الجداول والعلاقات

| الجدول                      | الغرض                                  | المفاتيح الأجنبية الرئيسية                              |
| --------------------------- | -------------------------------------- | ------------------------------------------------------- |
| **User**                    | المستخدمون (عميل، مهندس، أدمن)         | —                                                       |
| **Package**                 | باقات الخدمة                           | —                                                       |
| **Order**                   | الطلبات                                | clientId → User, engineerId → User, packageId → Package |
| **OrderAuditLog**           | سجل تدقيق الطلبات                      | orderId → Order, userId (بدون FK في الـ schema)         |
| **Plan**                    | المخططات المرفوعة للطلب                | orderId → Order                                         |
| **Message**                 | رسائل المحادثة                         | orderId → Order, senderId → User                        |
| **Payment**                 | المدفوعات                              | orderId → Order                                         |
| **PaymentIdempotency**      | منع الدفع المكرر                       | — (لا FK)                                               |
| **RevisionRequest**         | طلبات المراجعة                         | orderId → Order                                         |
| **Notification**            | إشعارات المستخدم                       | userId → User                                           |
| **PinPackConfig**           | إعداد سعر مجموعة الدبابيس (صف واحد)    | —                                                       |
| **RevisionsPurchaseConfig** | إعداد سعر التعديلات الإضافية (صف واحد) | —                                                       |
| **PinPackPurchase**         | مشتريات الدبابيس                       | orderId → Order                                         |
| **EngineerApplication**     | طلبات انضمام المهندسين                 | —                                                       |
| **HomepageContent**         | محتوى الصفحة الرئيسية (صف واحد، JSON)  | —                                                       |

**العلاقات الرئيسية:**

- User 1:N Order (كعميل)، User 1:N Order (كمهندس)، Package 1:N Order.
- Order 1:N Plan, Message, Payment, RevisionRequest, PinPackPurchase, OrderAuditLog.
- Cascade delete: حذف User يحذف الطلبات كعميل والرسائل والإشعارات؛ حذف Order يحذف الخطط والرسائل والمدفوعات وطلبات المراجعة والسجلات.

### 1.2 جودة الـ Schema والتطبيع (Normalization)

- **نقاط إيجابية:**
  - فصل واضح بين الكيانات (User, Order, Package, Message, Payment, …).
  - استخدام FKs مع `onDelete: Cascade` أو `SetNull` حسب المنطق (مثلاً engineerId SetNull عند حذف المهندس).
  - حقول محددة للتواريخ (createdAt, updatedAt, deadline, completedAt).
- **انحرافات مقصودة عن 3NF (مقبولة للاستخدام الحالي):**
  - **Order.formData**: JSON string (لقطة بيانات النموذج عند إنشاء الطلب) — تخزين تاريخي؛ تجنب التطبيع الكامل مقصود.
  - **Package.featuresJson**: JSON array للنصوص — مرن للإدارة.
  - **RevisionRequest.pins**: JSON للدبابيس — بنية مرنة.
  - **Notification.data**: JSON — بيانات إضافية.
- **ملاحظة:** حقل `OrderAuditLog.userId` لا يظهر كـ relation في prisma/schema.prisma؛ إن كان مرجعاً لـ User يُفضّل إضافة `user User @relation(...)` لضمان سلامة المرجعية.

### 1.3 الفهارس (Indexes) والأداء

- **موجود حاليًا:** فهارس على الحقول المستخدمة في الفلترة والربط: email, phone, role (User); clientId, engineerId, status, orderNumber, createdAt, deadline (Order); orderId في الجداول الفرعية؛ (status, createdAt) مركب لـ Order.
- **اقتراحات:**
  - **Message:** وجود `@@index([orderId, createdAt])` جيد للاستعلامات "آخر الرسائل لطلب معين".
  - إن ظهرت استعلامات بحث بالتاريخ فقط (مثلاً تقارير شهرية)، يمكن إضافة فهرس مركب إضافي حسب نمط الاستعلامات الفعلية.
  - **PaymentIdempotency:** الفهرس على `idempotencyKey` و `createdAt` كافٍ للاستعلامات الحالية.

### 1.4 ثغرات أمنية محتملة (قاعدة البيانات)

- **SQL Injection:**
  - الاستعلامات تتم عبر **Prisma Client** (where, data, include) — معاملات مُربوطة (parameterized)؛ لا يوجد تمرير مدخلات المستخدم إلى نصوص SQL خام في مسارات الـ API.
  - استخدام **Raw Queries** محدود: health route (tagged template آمن)، سكربتات لمرة واحدة (SQL ثابت).
  - **الخلاصة:** لا توجد ثغرة SQL Injection في مسارات الـ API الحالية؛ الاستمرار في تجنب `$executeRawUnsafe` مع أي مدخلات من الطلب.

### 1.5 تقييم استخدام ORM (Prisma)

- استخدام صحيح لـ **Prisma**: استعلامات عبر `findUnique`, `findFirst`, `findMany`, `create`, `update` مع `where`/`data`؛ لا بناء استعلام ديناميكي من نص المستخدم.
- التحقق من المدخلات يتم بـ **Zod** قبل الكتابة في DB — يقلل أخطاء البيانات ويحد من حقول غير متوقعة.

---

## 2. نظام المصادقة والصلاحيات (Authentication and Authorization)

### 2.1 التقنيات المستخدمة

- **NextAuth (Credentials Provider):** تسجيل دخول بالبريد وكلمة المرور؛ الجلسة JWT (استراتيجية `jwt`)، مدة الصلاحية 30 يومًا (lib/auth.ts: `maxAge: 30 * 24 * 60 * 60`).
- **Supabase Auth (اختياري):** عند `NEXT_PUBLIC_USE_SUPABASE_AUTH=true` يتم الاعتماد على جلسة Supabase (كوكي)؛ lib/getApiAuth.ts يقرأ المستخدم من Supabase ويُزامن/ينشئ سجل User في Prisma عند الحاجة.

### 2.2 مسار تسجيل الدخول (Login Flow) وأفضل الممارسات

- **تسجيل الدخول (NextAuth):** lib/auth.ts — authorize: يتحقق من البريد وكلمة المرور؛ كلمة المرور تُقارن عبر **bcrypt.compare** مع الهاش المخزن؛ رسالة الخطأ موحدة لتجنب تسريب وجود البريد.
- **التسجيل (Register):** app/api/auth/register/route.ts — التحقق بـ **Zod**؛ كلمة المرور تُخزّن بعد **bcrypt.hash(..., 10)**؛ التحقق من تكرار البريد/الجوال قبل الإنشاء.

### 2.3 Middleware وحماية المسارات

- **الملف:** middleware.ts. عند NextAuth: withAuth؛ المسارات غير العامة تتطلب وجود token. عند Supabase: getSupabaseSession؛ التوجيه لـ /login للصفحات فقط.
- **المسارات العامة:** lib/routes.ts — isPublicPath (/, /login, /register, /api/auth/register, /api/packages, /api/content/homepage, /api/engineer/applications/).
- **التحكم بالدور:** /admin/* → ADMIN؛ /engineer/* (ما عدا apply) → ENGINEER أو ADMIN؛ /orders/* مع ENGINEER → توجيه لـ /engineer/dashboard.

### 2.4 إدارة الـ Tokens والجلسات

- **التخزين:** NextAuth يستخدم JWT في Cookie (httpOnly). **مدة الصلاحية:** 30 يومًا — طويلة؛ اقتراح: تقليلها (مثلاً 7 أيام) أو إضافة آلية refresh.

### 2.5 حماية مسارات الـ API (Server-side)

- **الدوال الموحدة:** lib/requireAuth.ts — requireAuth, requireRole, requireAdmin, requireEngineerOrAdmin, requireClient؛ تعتمد على getApiAuth(request). المسارات الحساسة تستدعي أحدها.

### 2.6 نقاط إضافية للمصادقة

- **Rate limiting:** lib/rateLimit.ts — تخزين في الذاكرة؛ للإنتاج يُفضّل Redis.
- **Cron:** محمي بـ CRON_SECRET (query)؛ اقتراح: استخدام Header بدل query.
- **Health:** محمي بـ HEALTH_CHECK_SECRET أو جلسة Admin.

---

## 3. المخرجات المطلوبة: ملخص

### 3.1 قائمة الجداول (مرجع سريع)

User, Package, Order, OrderAuditLog, Plan, Message, Payment, PaymentIdempotency, RevisionRequest, Notification, PinPackConfig, RevisionsPurchaseConfig, PinPackPurchase, EngineerApplication, HomepageContent.

### 3.2 قائمة الثغرات/المخاطر والمقترحات

| # | النوع | الوصف | الأولوية | المقترح |
|---|--------|--------|----------|---------|
| 1 | جلسة طويلة | JWT maxAge 30 يوم يزيد من نافذة الخطر عند سرقة الكوكي | متوسطة | تقليل maxAge (مثلاً 7 أيام) أو خيار "تذكرني" مع مدد مختلفة |
| 2 | Rate limit موزع | التخزين في الذاكرة لا يعمل عبر عدة نسخ سيرفر | متوسطة | استخدام Redis لـ rate limiting في الإنتاج |
| 3 | مصدر IP | الاعتماد على x-forwarded-for قابل للتلاعب | منخفضة | التأكد من أن الـ reverse proxy يضع القيم ويُقصّ من العميل |
| 4 | كلمة مرور placeholder (Supabase) | bcrypt.hash(user.id + NEXTAUTH_SECRET) قابل للتخمين نظرياً | منخفضة | استخدام crypto.randomBytes(32) ككلمة مرور placeholder |
| 5 | OrderAuditLog.userId | لا يوجد relation صريح لـ User في الـ schema | منخفضة | إضافة relation اختيارية لـ User |
| 6 | Cron secret في URL | تمرير السر في query قد يظهر في السجلات | منخفضة | استدعاء الـ cron بـ Header (مثل x-cron-secret) بدل ?key= |

### 3.3 أخطاء منطقية مقترح تصحيحها

- **Placeholder password عند تزامن Supabase User (lib/getApiAuth.ts):**  
  **الحالي:** `const placeholderPassword = await bcrypt.hash(user.id + (process.env.NEXTAUTH_SECRET ?? ''), 10)`  
  **مقترح:** `const placeholderPassword = await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), 10)`  
  لأن هذا الحساب لا يُستخدم للدخول عبر Credentials (الدخول عبر Supabase فقط).

---

## 4. خلاصة

- **قاعدة البيانات:** Schema منظم، علاقات واضحة، فهارس مناسبة؛ لا SQL Injection في الـ API.
- **المصادقة:** bcrypt، NextAuth JWT أو Supabase session؛ حماية المسارات عبر middleware و requireAuth/requireRole.
- **التحسينات المقترحة:** تقصير مدة الجلسة، rate limiting موزع (Redis)، تحسين كلمة المرور الافتراضية للمستخدمين من Supabase، وحماية أفضل لسر الـ cron (Header بدل query).
