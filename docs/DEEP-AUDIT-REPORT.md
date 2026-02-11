# تقرير الفحص العميق — منصة فكرة (Deep Audit Report)

تم إجراء الفحص من منظور فريق متعدد التخصصات: مهندس برمجيات أول، مبرمج Backend، مهندس قواعد بيانات، وخبير أمن سيبراني. **لا يُفترض تنفيذ أي تعديل على الكود من هذا التقرير؛ الهدف هو توثيق نقاط القوة والضعف واقتراح التعديلات فقط.**

---

## 1. الـ Backend وهيكلة الكود (Software Architect)

### 1.1 نقاط القوة

- **بنية App Router:** المشروع يستخدم Next.js App Router بشكل صحيح: مجلدات `app/(auth)`, `app/(client)`, `app/admin`, `app/engineer`, `app/api` مع توجيه واضح و Route Groups.
- **تقسيم API:** مسارات الـ API منظمة حسب المجال (orders, messages, plans, revisions, admin, engineer، إلخ) مع معاملات ديناميكية `[id]`, `[orderId]` بشكل متسق.
- **معالجة أخطاء موحدة:** وجود `lib/errors.ts` مع `handleApiError()` يعالج Zod، Prisma (P2002, P2025, P2003, P1000، إلخ)، و`AppError`، وأخطاء الاتصال بقاعدة البيانات. غالبية مسارات الـ API تستخدم `handleApiError` في كتلة `catch`.
- **طبقة مصادقة موحدة:** `lib/requireAuth.ts` يوفّر `requireAuth`, `requireRole`, `requireAdmin`, `requireEngineerOrAdmin`, `requireClient` مما يقلل التكرار في التحقق من الصلاحيات.

### 1.2 نقاط الضعف والاقتراحات

| # | الضعف | الموقع | الاقتراح البرمجي |
|---|--------|--------|-------------------|
| 1 | **منطق التحقق من صلاحية الطلب مكرر** في عدة مسارات (مثل `messages/[orderId]`, `orders/[id]`, `orders/[id]/plans/[planId]/download`): نفس الشروط (ADMIN أي طلب، ENGINEER الطلب المعين له، CLIENT الطلب الخاص به). | عدة route handlers | إنشاء دالة مساعدة في `lib/` مثل `assertOrderAccess(auth, order)` أو `getOrderIfAllowed(prisma, orderId, auth)` تُرجع الطلب أو ترمي `AppError(403)` أو تُرجع Response جاهز. استدعاؤها من كل route بدل تكرار الشروط. |
| 2 | **حل معاملات الـ params غير موحّد:** بعض المسارات تستخدم `await Promise.resolve(params)` مع تحقق يدوي من `orderId` (مثل `messages/[orderId]`). | مثلاً `app/api/messages/[orderId]/route.ts` | توحيد استخراج المعاملات في helper صغير، مثلاً `getRouteParam(params, 'orderId')` أو استخدام نمط واحد في كل الـ routes (مثلاً دائماً `params` كـ Promise وحلّها مرة واحدة في بداية الـ handler). |
| 3 | **Cron purge لا يلفّ التنفيذ في try/catch:** في `app/api/cron/purge-archived-plans/route.ts` لا يوجد `try/catch` مع `handleApiError`؛ أي استثناء غير متوقع سيرجع 500 بدون تنسيق موحد. | `app/api/cron/purge-archived-plans/route.ts` | لفّ جسم الـ GET في `try/catch` واستدعاء `handleApiError` في الـ catch، مع الحفاظ على التحقق من `CRON_SECRET` قبل أي عمل. |
| 4 | **عدم استخدام Server Actions لعمليات الكتابة من الواجهة:** إن وُجدت نماذج أو أزرار تقوم بكتابة بيانات عبر fetch إلى API فقط، يمكن تقييم تحويلها إلى Server Actions لتبسيط الكود وتقليل التعقيد في الـ client. | N/A (تقييم فقط) | مراجعة صفحات تحتوي على `fetch` لـ POST/PATCH؛ إن كانت بسيطة ومن نفس الـ app، يمكن استبدالها بـ Server Action مع `useFormState` أو غيره حسب الحاجة. |

---

## 2. المصادقة والأمان (Security Engineer)

### 2.1 نقاط القوة

- **التحقق من الجلسة في جهة الخادم:** في `getApiAuth()` يتم استخدام Supabase عبر `createClientFromRequest(request)` ثم `supabase.auth.getUser()` — أي التحقق يعتمد على JWT/Cookies في الطلب ويتم على الخادم. لا يعتمد التطبيق على التحقق من الجلسة في المتصفح فقط.
- **مفاتيح البيئة:** لا توجد مفاتيح حساسة مكشوفة في الكود. `SUPABASE_SERVICE_ROLE_KEY` و `DATABASE_URL` و `NEXTAUTH_SECRET` و `CRON_SECRET` و `HEALTH_CHECK_SECRET` لا تُعرَض للمتصفح. المتغيرات ذات البادئة `NEXT_PUBLIC_` المستخدمة هي: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_USE_SUPABASE_AUTH`, `NEXT_PUBLIC_APP_URL` — وهي مناسبة للعميل (الرابط والمفتاح العام معروفان حسب تصميم Supabase).
- **Health endpoint محمي:** `/api/system/health` يتطلب إما `HEALTH_CHECK_SECRET` (header أو query) أو جلسة Admin؛ ولا يُرجع قيم المتغيرات الفعلية بل فقط وجودها (boolean).
- **Rate limiting:** الـ middleware يطبّق حد معدل على مسارات الـ API وحد أشد على مسارات المصادقة (تسجيل، نسيت كلمة المرور).

### 2.2 نقاط الضعف والاقتراحات

| # | الضعف | الموقع | الاقتراح البرمجي |
|---|--------|--------|-------------------|
| 1 | **Fallback لـ createSupabaseServer عند غياب المستخدم من الطلب:** في `getApiAuth` إذا لم يُستخرج المستخدم من `createClientFromRequest(request)` يتم استدعاء `createSupabaseServer()` و`getUser()`. في سياق Route Handler قد لا تكون الـ cookies متاحة بنفس الطريقة (اعتماداً على كيفية استدعاء الـ API). | `lib/getApiAuth.ts` | توثيق أن مصدر الحقيقة للجلسة في API هو الطلب (cookies في الـ request). إن وُجدت سيناريوهات تستدعي الـ API بدون إرسال cookies (مثلاً من طرف ثالث)، عدم الاعتماد على createSupabaseServer() كبديل قد يمنع مصادقة خاطئة. مراجعة أن جميع استدعاءات الـ API من الواجهة ترسل credentials. |
| 2 | **CSP في next.config يعتمد على قيمة بيئية:** السطر الذي يبني `connect-src` يضيف نطاقات التطوير فقط عندما `NODE_ENV === 'development'`. التأكد من أن سياسة CSP لا تسمح بـ connect إلى نطاقات غير مرغوبة في الإنتاج. | `next.config.js` | مراجعة القائمة النهائية لـ `connect-src` و `script-src` في الإنتاج؛ إضافة أي نطاقات ضرورية (مثل Vercel Analytics إن وُجدت) وتضييق النطاق قدر الإمكان. |
| 3 | **مفتاح Anon معروف للعميل:** هذا متوقع في Supabase؛ يجب الاعتماد على RLS إذا تم الاتصال بقاعدة Supabase مباشرة من العميل. المشروع يستخدم Prisma واتصالاً من الخادم فقط لقاعدة البيانات، لذا الصلاحيات تُطبّق في الـ API. | N/A | إذا تم في المستقبل استخدام Supabase كقاعدة من الواجهة (Realtime أو queries مباشرة)، يجب تفعيل RLS وعدم الاعتماد على الـ anon key وحده. |

---

## 3. رفع الملفات والتخزين (Cloud Architect)

### 3.1 نقاط القوة

- **التحقق من النوع والحجم قبل الرفع:** في `app/api/plans/upload/route.ts` يتم التحقق من نوع الملف (`image/jpeg`, `image/png`, `image/jpg`, `application/pdf`) وحجم الملف (حد أقصى 10MB ثم 5MB بعد الحفظ). في `lib/uploadEngineerFile.ts` نفس الأنواع وحد 10MB.
- **مسارات الملفات منظمة:** في `uploadEngineerFileToOrders` المسار يُبنى كـ `folder/uniqueName` حيث `uniqueName = randomUUID() + extension`، أي لا يوجد تداخل بين المستخدمين ولا تخمين سهل للمسار.
- **استخدام bucket واحد (orders) مع مجلد فرعي (plans):** يسهل السياسات والنسخ الاحتياطي. الحذف يتم عبر `deleteFromSupabaseBucket` باستخدام Service Role.
- **عند تجاوز حد الحجم بعد الحفظ:** يتم حذف الملف المرفوع (وإزالة سجل FileExpiryTracker إن وُجد) قبل إرجاع خطأ 413.

### 3.2 نقاط الضعف والاقتراحات

| # | الضعف | الموقع | الاقتراح البرمجي |
|---|--------|--------|-------------------|
| 1 | **التحقق من نوع الملف يعتمد على `file.type` فقط:** المتصفح يحدد الـ MIME؛ يمكن للمستخدم إرسال امتداد مختلف مع تغيير الـ Content-Type. | `plans/upload/route.ts`, `lib/uploadEngineerFile.ts` | إضافة تحقق من "magic bytes" (أو مكتبة مثل `file-type`) للعينات الأولى من الـ buffer للتأكد من أن المحتوى يطابق النوع المعلن، ورفض الملف إن لم يتطابق. |
| 2 | **عدم تحديد حد لعدد الملفات لكل طلب:** لا يوجد حد صريح لعدد المخططات النشطة لكل طلب في نفس الـ route. | منطق الأعمال / API | إن كان مطلوباً من ناحية المنتج، إضافة حد (مثلاً من إعدادات الباقة أو حد ثابت) والتحقق منه قبل إنشاء Plan جديد. |
| 3 | **روابط التحميل العامة (Supabase public URL):** الملفات المُرفعة تُخدم عبر رابط عام. من يملك الرابط يمكنه الوصول. الأمان يعتمد على عدم كشف الروابط إلا للمصرح لهم عبر واجهة التطبيق. | التصميم الحالي | مقبول إذا كان الـ bucket لا يسمح بالـ list. التأكد من أن سياسة الـ bucket في Supabase تمنع الـ list العام. إن رغبت بتحكم أقوى، يمكن تقديم التحميل عبر API فقط (stream من Storage إلى response) دون إرجاع رابط عام للملف. |

---

## 4. قواعد البيانات والـ RLS (DB Engineer)

### 4.1 نقاط القوة

- **العلاقات والقيود في Prisma:** نموذج `User` مع `clientOrders`, `engineerOrders`, `messages`, `notifications`؛ `Order` مع `client`, `engineer`, `package`, `plans`, `messages`, إلخ. استخدام `onDelete: Cascade` أو `SetNull` حيث مناسب. الفهارس موجودة على الحقول المستخدمة في الاستعلامات (مثل `clientId`, `engineerId`, `status`, `orderNumber`, `createdAt`, `deadline`).
- **جدول FileExpiryTracker:** بسيط (id, filePath, expiryDate, isDeleted, createdAt) مع فهارس على `expiryDate` و `isDeleted` — مناسب لاستعلامات الحذف الدوري إن تم تنفيذها.
- **صلاحيات الوصول تُطبّق في طبقة التطبيق:** كل مسار API يتحقق من `auth.userId` و `auth.role` ثم يتحقق من ملكية الطلب/الموارد قبل إرجاع البيانات.

### 4.2 نقاط الضعف والاقتراحات

| # | الضعف | الموقع | الاقتراح البرمجي |
|---|--------|--------|-------------------|
| 1 | **عدم وجود RLS موثّق أو مُطبّق في المشروع:** قاعدة البيانات قد تكون Supabase Postgres أو Postgres خارجي. الكود لا يحتوي على سياسات RLS (CREATE POLICY). الوصول يتم عبر Prisma باستخدام اتصال واحد (غالباً service أو مستخدم التطبيق)، لذا RLS إن كان مفعّلاً قد لا يُطبَّق بنفس الطريقة. | قاعدة البيانات / Supabase | إذا كانت قاعدة البيانات هي Supabase Postgres: توثيق ما إذا كان RLS مفعّلاً على الجداول. إن كان مفعّلاً، التأكد من أن سياسات RLS تمنع المستخدم من قراءة/كتابة صفوف لا يملكها (مثلاً Order حيث clientId/engineerId لا يطابق المستخدم الحالي). إن كانت القاعدة منفصلة (مثلاً Vercel Postgres)، RLS قد لا يكون متاحاً — الاعتماد على صلاحيات التطبيق كما هو حالي. |
| 2 | **RevisionRequest.planId بدون علاقة Prisma:** الحقل `planId` من نوع `String?` بدون `@relation` إلى `Plan`. لا يوجد قيد Foreign Key من Prisma. | `prisma/schema.prisma` | إن رغبت بضمان تكامل referential: إضافة علاقة اختيارية من `RevisionRequest` إلى `Plan` (مع `onDelete: SetNull`) أو على الأقل توثيق أن الحذف/التعديل لـ Plan يُدار في التطبيق (مثلاً عدم حذف Plan مرتبط بـ RevisionRequest دون تحديث أو قبول أن planId قد يشير لسجل محذوف). |
| 3 | **Package لا يُحذف عند وجود Orders:** العلاقة من Order إلى Package بدون `onDelete`. حذف Package قد يفشل إذا كان هناك orders مرتبطة (حسب سلوك Prisma/DB). | `prisma/schema.prisma` | إذا كان حذف الباقات مسموحاً: تحديد السلوك المطلوب (منع الحذف، أو Restrict، أو تعطيل بدل الحذف). حالياً `isActive` يسمح بإخفاء الباقة دون حذف — مناسب. توثيق أن الحذف الفعلي للـ Package غير مدعوم أو يُمنع من واجهة الإدارة. |
| 4 | **User: لا يوجد حقل unique لـ auth provider id:** عند استخدام Supabase Auth، المستخدم يُعرّف بـ UUID من Supabase. إن تم ربط نفس الحساب بـ Prisma بـ `id: user.id` (Supabase UUID) يكون التعريف فريداً. التأكد من أن عدم تكرار المستخدمين يعتمد على `email` أو `id` حسب مصدر الحساب. | منطق التسجيل والمصادقة | مراجعة سيناريو "موجود بالبريد في Prisma لكن مختلف الـ id في Supabase" (تم التعامل معه في getApiAuth بالبحث عن existingByEmail). توثيق أن دمج الحسابات أو ربطها يتم بهذا الشكل فقط دون إنشاء مستخدم مكرر. |

---

## 5. الخوارزميات والأتمتة (Algorithms & Logic)

### 5.1 نقاط القوة

- **Cron purge-archived-plans منظم منطقياً:** تحديد نافذة التحذير (7 أيام قبل الحذف) ونافذة الحذف (45 يوماً بعد الموعد النهائي) واضح. الاستعلامات تستخدم فهارس مناسبة (`status`, `deadline`, `plansPurgedAt`, `archivedWarningSentAt`).
- **استخدام المعاملات:** تحديث الطلب والخطط والإشعارات يتم داخل `prisma.$transaction` حيث يلزم (تحذير، وتحديث plansPurgedAt مع تحديث الخطط).
- **حماية استدعاء الـ Cron:** التحقق من `CRON_SECRET` قبل تنفيذ أي عمل.

### 5.2 نقاط الضعف والاقتراحات

| # | الضعف | الموقع | الاقتراح البرمجي |
|---|--------|--------|-------------------|
| 1 | **الـ Cron لا يحذف الملفات فعلياً من التخزين:** المسار `purge-archived-plans` يحدّث جدول `Plan` فقط (`purgedAt`, `fileUrl: ''`) ولا يستدعي حذف الملف من Supabase Storage (أو من القرص المحلي). الملفات تبقى في الـ bucket إلى ما لا نهاية. | `app/api/cron/purge-archived-plans/route.ts` | بعد تحديث كل Plan وإعداد `fileUrl` فارغ، استدعاء `deleteFileByUrl(plan.fileUrl)` (أو ما يعادله) **قبل** مسح `fileUrl`، لكل plan يملك `fileUrl` غير فارغ. التعامل مع الأخطاء: إن فشل حذف ملف واحد، تسجيل الخطأ والمتابعة مع بقية الملفات (أو التراجع عن الـ transaction للطلب الحالي حسب السياسة). |
| 2 | **جدول FileExpiryTracker غير مستهلك:** السجلات تُضاف عند رفع الملف عبر `uploadEngineerFileToOrders` (صلاحية 30 يوماً)، لكن لا يوجد في المشروع أي Cron أو Edge Function يقرأ السجلات التي `expiryDate <= now` و `isDeleted = false` ويحذف الملفات من Storage ثم يحدّث `isDeleted`. | المشروع بالكامل | إن كان المقصود حذف ملفات "مؤقتة" بعد 30 يوماً: إضافة مسار Cron (مثلاً `/api/cron/purge-expired-files`) محمي بـ CRON_SECRET، يستعلم عن `FileExpiryTracker` حيث `expiryDate <= now` و `isDeleted = false`، ثم لكل سجل: استدعاء `deleteFromSupabaseBucket('orders', filePath)`، ثم تحديث السجل إلى `isDeleted: true`. معالجة الدفعات (batch) لتجنب timeout (مثلاً 100 سجل في كل تشغيل). إن لم يكن الحذف بعد 30 يوماً مطلوباً، إما إزالة تسجيل FileExpiryTracker أو توثيق أن الحذف يتم عبر آلية خارجية (مثل Supabase Edge Function). |
| 3 | **معالجة عدد كبير من الطلبات في نفس التشغيل:** الحلقة `for (const order of ordersToPurge)` تنفذ عدة عمليات Prisma لكل طلب (transaction + إشعار). مع آلاف الطلبات قد يتجاوز الـ Cron حد وقت التنفيذ (مثلاً 60 ثانية على Vercel). | `app/api/cron/purge-archived-plans/route.ts` | تحديد حد أقصى لعدد الطلبات المعالجة في كل استدعاء (مثلاً 50 أو 100)، باستخدام `take: 100` في `findMany`. في الاستدعاء التالي سيتم معالجة الباقي. يمكن إرجاع `hasMore` في الـ response لجدولة استدعاءات متتابعة إن لزم. |
| 4 | **إشعارات خارج الـ transaction:** إنشاء الإشعار `archive_purged` يتم بعد `$transaction` لكل طلب. إن فشل إنشاء الإشعار بعد نجاح الـ transaction، الطلب يُعتبر "تم حذف ملفاته" دون إشعار العميل. | نفس الملف | نقل `prisma.notification.create` داخل الـ transaction لنفس الطلب (كجزء من مصفوفة العمليات في `$transaction`) لضمان atomicity، أو الاحتفاظ بالوضع الحالي مع تسجيل فشل الإشعار وإعادة المحاولة لاحقاً (queue) إن وُجدت بنية تحتية لذلك. |

---

## 6. ملخص تنفيذي

| المحور | أبرز نقاط القوة | أبرز نقاط التحسين |
|--------|------------------|---------------------|
| **Backend / الهيكلة** | معالجة أخطاء موحدة، requireAuth/requireRole، تنظيم API | دمج منطق التحقق من صلاحية الطلب في helper، توحيد params، حماية Cron بـ try/catch |
| **المصادقة والأمان** | تحقق الجلسة server-side، عدم تسريب مفاتيح، health محمي | توثيق سلوك الجلسة من الطلب فقط، مراجعة CSP للإنتاج |
| **الرفع والتخزين** | التحقق من النوع والحجم، مسارات فريدة (UUID) | التحقق من محتوى الملف (magic bytes)، مراجعة سياسة الـ bucket (list) |
| **قواعد البيانات** | علاقات Prisma سليمة، فهارس مناسبة، صلاحيات في التطبيق | توثيق/تفعيل RLS إن كانت القاعدة Supabase، علاقة RevisionRequest ↔ Plan، سلوك حذف Package |
| **الأتمتة** | منطق 45 يوم + تحذير 7 أيام، CRON_SECRET، transactions | حذف الملفات فعلياً من Storage في purge، استهلاك FileExpiryTracker أو إزالته، حد أقصى لعدد الطلبات في التشغيل، إشعارات داخل transaction أو إعادة محاولة |

---

*تم إعداد التقرير بناءً على فحص الكود والمخطط فقط. أي تغييرات على البنية التحتية (Supabase، Vercel، قاعدة البيانات) يجب أن تُراجع بشكل منفصل.*
