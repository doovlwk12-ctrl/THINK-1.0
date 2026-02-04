# تقرير فحص وتحليل المشروع — منصة فكرة مع Vercel

تقرير شامل: بنية المشروع، سير العمل، التحقق خطوة بخطوة مع Vercel، الإشكاليات الموجودة والمتوقعة مع الحلول، والتوصيات.

---

## 1. نظرة عامة على المشروع

| البند | الوصف |
|-------|--------|
| **اسم المشروع** | fekra-platform (منصة فكرة) |
| **الإصدار** | 2.1.0 |
| **الوصف** | منصة تربط العملاء بالمهندسين المعماريين لإتمام مشاريع التخطيط المعماري (طلبات، مخططات، تعديلات، محادثة، إشعارات). |
| **التقنيات الأساسية** | Next.js 14، React 18، TypeScript، Prisma (PostgreSQL)، NextAuth أو Supabase Auth، Tailwind CSS، Vercel للنشر. |
| **قاعدة البيانات** | PostgreSQL (Supabase في الإنتاج). المخطط في `prisma/schema.prisma` مع النماذج: User، Order，Package،Plan،Message،RevisionRequest،Notification،Payment،PinPackConfig،RevisionsPurchaseConfig،EngineerApplication،HomepageContent. |

---

## 2. البنية والتبعيات

### 2.1 هيكل التطبيق

- **الصفحات:** App Router تحت `app/` — `(auth)` للتسجيل والدخول، `(client)` للعميل، `admin/` للأدمن، `engineer/` للمهندس.
- **الـ API:** تحت `app/api/` — مسارات محمية حسب الدور عبر `requireAuth`، `requireClient`، `requireEngineerOrAdmin`، `requireAdmin` من `lib/requireAuth.ts`.
- **المصادقة:** `middleware.ts` يوجّه حسب الدور (عميل → `/dashboard`، مهندس → `/engineer/dashboard`، أدمن → `/admin/dashboard`) ويحمي المسارات غير العامة. المسارات العامة معرّفة في `lib/routes.ts`.
- **البناء:** `prebuild` يشغّل `check-routes` للتحقق من تعارض المسارات الديناميكية؛ ثم `next build`.

### 2.2 التبعيات الرئيسية

- **dependencies:** next، react، @prisma/client، next-auth، @supabase/ssr و supabase-js، firebase و firebase-admin (اختياري)، zod، react-hook-form، وغيرها.
- **devDependencies:** prisma، eslint، eslint-config-next، typescript، vitest، playwright.
- **ملاحظة:** تحذيرات npm (rimraf، glob، eslint، google-p12-pem، إلخ) موثقة في [docs/VERCEL-BUILD-WARNINGS-PLAN.md](VERCEL-BUILD-WARNINGS-PLAN.md). البناء ينجح رغمها.

---

## 3. سير العمل (Order Workflow) — ملخص

المرجع الكامل: [docs/ORDER-WORKFLOW.md](ORDER-WORKFLOW.md).

| المرحلة | من | الإجراء | الحالة بعد الإجراء |
|---------|-----|---------|---------------------|
| 1 | العميل | إنشاء طلب (نموذج 5 خطوات، اختيار باقة) | PENDING |
| 2 | المهندس | بدء العمل (`POST /api/engineer/orders/[id]/start`) | IN_PROGRESS، تعيين engineerId |
| 3 | المهندس | رفع مخطط ثم إرسال للعميل (`/api/plans/upload`، `POST /api/plans/send`) | COMPLETED |
| 4 | العميل | طلب تعديل (دبابيس + ملاحظات، `POST /api/revisions/create`) | IN_PROGRESS، remainingRevisions يُخصم |
| 5 | العميل | تأكيد إنهاء الطلب (`POST /api/orders/[id]/complete`) عندما الحالة COMPLETED | CLOSED |
| 6 | النظام | انتهاء الموعد (deadline): COMPLETED → CLOSED؛ غير منتهٍ → ARCHIVED. بعد 45 يوم من الموعد: حذف ملفات المخططات (Cron). | CLOSED / ARCHIVED |

**إجراءات إضافية:** شراء تعديلات إضافية، شراء تمديد (لطلبات ARCHIVED)، شراء مجموعة دبابيس — كلها عبر مسارات API مخصصة وإعدادات أدمن.

---

## 4. التحقق خطوة بخطوة مع Vercel

### 4.1 قبل النشر (محلياً)

| الخطوة | الأمر / الإجراء | التحقق |
|--------|------------------|--------|
| 1 | `npm install` | اكتمال بدون أخطاء (تحذيرات deprecated مقبولة). |
| 2 | `npx prisma generate` | نجاح (يُشغّل تلقائياً في postinstall). |
| 3 | `npm run lint` | لا أخطاء ESLint. |
| 4 | `npm run build` | اكتمال البناء وعدم وجود أخطاء TypeScript. |
| 5 | في `prisma/schema.prisma` | `provider = "postgresql"` للإنتاج. |

### 4.2 إعداد Vercel (من الواجهة)

| الخطوة | الموقع | الإجراء |
|--------|---------|---------|
| 1 | Vercel → Project → Settings → Git | Production Branch = `main`؛ المستودع مرتبط بشكل صحيح. |
| 2 | Vercel → Project → Settings → Environment Variables | تعبئة المتغيرات حسب [docs/DEPLOYMENT.md](DEPLOYMENT.md): `DATABASE_URL` (Transaction pooler، منفذ 6543، + `?pgbouncer=true`)، `NEXTAUTH_SECRET`، `NEXTAUTH_URL`؛ إن Supabase: `USE_SUPABASE_AUTH`، `NEXT_PUBLIC_USE_SUPABASE_AUTH`، `NEXT_PUBLIC_SUPABASE_URL`، `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| 3 | Supabase Dashboard → Project Settings → Database | نسخ Connection string → **Transaction** (منفذ 6543)، إضافة `?pgbouncer=true` في النهاية، استخدامه في `DATABASE_URL` على Vercel. |
| 4 | Supabase → Authentication → URL Configuration | Site URL و Redirect URLs (بما فيها `/reset-password`) مطابقة لرابط الموقع المنشور. |
| 5 | مرة واحدة على قاعدة الإنتاج | من جهازك مع `.env` يشير إلى نفس Supabase: `npx prisma migrate deploy` أو `npx prisma db push`. |

### 4.3 بعد النشر

| الخطوة | الإجراء |
|--------|---------|
| 1 | فتح رابط الموقع والصفحة الرئيسية. |
| 2 | تسجيل الدخول (عميل/مهندس/أدمن) والتأكد من التوجيه إلى اللوحة الصحيحة. |
| 3 | استدعاء مسار يستخدم DB (مثل `/api/packages` أو بعد الدخول `/api/orders/my-orders`) — التأكد من عدم 503. |
| 4 | التحقق من أن آخر Deployment مبني من أحدث commit (عدم الاعتماد على Redeploy لنشر قديم؛ راجع [docs/VERCEL-BUILD-OLD-COMMIT.md](VERCEL-BUILD-OLD-COMMIT.md)). |

قائمة التحقق الكاملة (بما فيها E2E): [docs/VERIFICATION-CHECKLIST.md](VERIFICATION-CHECKLIST.md).

---

## 5. الإشكاليات الموجودة والمتوقعة — والحلول

### 5.1 إشكاليات تم حلها في الكود (موثقة)

| الإشكالية | الحل المطبق | المراجع |
|-----------|-------------|---------|
| 503 (قاعدة البيانات) | استخدام `DATABASE_URL` عبر Supabase Transaction pooler (6543) + `?pgbouncer=true`. | [docs/DEPLOYMENT.md](DEPLOYMENT.md)، [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| 429 (Too Many Requests) | استثناء `/api/auth/session` و `/api/auth/_log` ومسارات الـ polling من الحد الصارم في middleware. | [middleware.ts](../middleware.ts)، [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| 405 على `/api/messages/send` و `/api/plans/send` | معالجات GET/HEAD/OPTIONS تعيد 200/204 بدل 405. | [app/api/messages/send/route.ts](../app/api/messages/send/route.ts)، [app/api/plans/send/route.ts](../app/api/plans/send/route.ts) |
| 500 على `/api/plans/upload` (Vercel بدون S3/Cloudinary) | في `lib/storage.ts` رمي خطأ محدد عند Vercel بدون تخزين سحابي؛ في route إرجاع 503 مع رسالة عربية. | [lib/storage.ts](../lib/storage.ts)، [app/api/plans/upload/route.ts](../app/api/plans/upload/route.ts) |
| 500 على GET `/api/messages/:orderId` (والمحادثة) | معالجة `params` كـ Promise: `const { orderId } = await Promise.resolve(params)` في `app/api/messages/[orderId]/route.ts` و `app/api/revisions/[orderId]/route.ts`. | تم في commit سابق |

### 5.2 إشكاليات متوقعة — وحلول موصى بها

#### أ) مسارات API ديناميكية أخرى و `params` كـ Promise

**المشكلة:** في Next.js 14+ قد تُمرَّر `params` كـ Promise في بيئة Vercel. استخدام `params.id` أو `params.orderId` مباشرةً ينتج `undefined` ويؤدي إلى 500 أو سلوك خاطئ.

**المسارات التي لا تزال تستخدم `params.xxx` مباشرة (بدون `await Promise.resolve(params)`):**

- `app/api/orders/[id]/route.ts` — params.id
- `app/api/orders/[id]/complete/route.ts` — params.id
- `app/api/orders/[id]/buy-extension/route.ts` — params.id
- `app/api/orders/[id]/buy-pin-pack/route.ts` — params.id
- `app/api/orders/[id]/buy-revisions/route.ts` — params.id
- `app/api/orders/[id]/plans/route.ts` — params.id
- `app/api/engineer/orders/[id]/route.ts` — params.id
- `app/api/engineer/orders/[id]/start/route.ts` — params.id
- `app/api/engineer/orders/[id]/status/route.ts` — (يُحتمل)
- `app/api/engineer/orders/[id]/extend/route.ts` — params.id
- `app/api/admin/packages/[id]/route.ts` — params.id
- `app/api/admin/engineers/applications/[id]/approve/route.ts` — params.id
- `app/api/admin/engineers/applications/[id]/reject/route.ts` — params.id
- `app/api/revisions/detail/[revisionId]/route.ts` — params.revisionId
- `app/api/engineer/applications/[token]/route.ts` — params.token

**الحل:** في كل Route Handler يستخدم معلمة ديناميكية، توحيد النمط:

```ts
// نوع params متوافق مع Promise أو كائن
{ params }: { params: Promise<{ id: string }> | { id: string } }
// ثم داخل الدالة:
const { id } = await Promise.resolve(params)
if (!id) return Response.json({ error: 'معرف مطلوب' }, { status: 400 })
```

وتطبيق نفس الفكرة لـ `orderId`، `planId`، `revisionId`، `token` حسب المسار.

**الأولوية:** عالية — تجنّب 500 عشوائية على Vercel عند جلب طلب أو تنفيذ إجراء على طلب/باقة/تعديل.

---

#### ب) بناء Vercel من commit قديم

**المشكلة:** النقر على "Redeploy" لنشر قديم يعيد بناء نفس الـ commit ولا يجلب أحدث كود من `main`.

**الحل:** عند الرغبة في نشر أحدث كود: دفع commit جديد إلى `main` (مثلاً `git push origin main`) وانتظار نشر تلقائي جديد. التحقق من Vercel → Settings → Git أن Production Branch = `main`. المراجع: [docs/VERCEL-BUILD-OLD-COMMIT.md](VERCEL-BUILD-OLD-COMMIT.md)، [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

#### ج) تحذيرات البناء (npm deprecated، webpack)

**المشكلة:** تحذيرات أثناء `npm install` أو `next build` (rimraf، glob، eslint، google-p12-pem، إلخ). البناء ينجح.

**الحل:** مراجعة [docs/VERCEL-BUILD-WARNINGS-PLAN.md](VERCEL-BUILD-WARNINGS-PLAN.md). الإجراءات المقترحة: توثيق وقبول، أو تجربة overrides لـ rimraf فقط مع اختبار، وترقية ESLint عند ترقية Next لاحقاً.

---

#### د) رفع المخططات على Vercel بدون S3/Cloudinary

**المشكلة:** على Vercel نظام الملفات read-only؛ رفع المخططات يفشل بدون تخزين سحابي.

**الحل:** إما إعداد S3 أو Cloudinary في متغيرات البيئة على Vercel (راجع [lib/storage.ts](../lib/storage.ts))، أو قبول أن الرفع يعيد 503 مع رسالة عربية واضحة حتى يتم الإعداد.

---

#### هـ) تسريب بيانات أو صلاحيات

**الوقاية الحالية:** استخدام `requireAuth` و `requireClient` و `requireEngineerOrAdmin` و `requireAdmin` في المسارات؛ التحقق من ملكية الطلب (clientId / engineerId) أو دور الأدمن قبل إرجاع البيانات أو تنفيذ الإجراء. مرجع الصلاحيات: [docs/AUTH.md](AUTH.md).

**التوصية:** مراجعة دورية لأي مسار API جديد يضاف للتأكد من استدعاء الدالة المناسبة وفحص الصلاحيات.

---

## 6. التوصيات والتنظيم

### 6.1 تنظيم الوثائق

| المستند | الغرض |
|---------|--------|
| [docs/DEPLOYMENT.md](DEPLOYMENT.md) | خطوات النشر ومتغيرات البيئة وإصلاح 503. |
| [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) | تفادي الإشكاليات الشائعة وحلها (503، 429، 405، 500، بناء قديم). |
| [docs/VERIFICATION-CHECKLIST.md](VERIFICATION-CHECKLIST.md) | قائمة تحقق النشر و E2E اليدوية. |
| [docs/VERCEL-BUILD-WARNINGS-PLAN.md](VERCEL-BUILD-WARNINGS-PLAN.md) | خطة تحذيرات البناء. |
| [docs/VERCEL-BUILD-OLD-COMMIT.md](VERCEL-BUILD-OLD-COMMIT.md) | حل مشكلة البناء من commit قديم. |
| [docs/ORDER-WORKFLOW.md](ORDER-WORKFLOW.md) | سير عمل الطلب بالكامل. |
| [docs/AUTH.md](AUTH.md) | المصادقة والصلاحيات. |
| **docs/PROJECT-AUDIT-REPORT.md** (هذا الملف) | فحص وتحليل المشروع مع Vercel والإشكاليات والحلول. |

### 6.2 أولويات تنفيذ مقترحة

1. **فوري:** التأكد من `DATABASE_URL` على Vercel يستخدم Pooler + `?pgbouncer=true`، وضبط Supabase Auth URLs، وتشغيل الهجرات مرة واحدة.
2. **قصير المدى:** تطبيق معالجة `params` كـ Promise في كل مسارات الـ API الديناميكية المتبقية (القائمة في 5.2 أ) ثم إعادة النشر.
3. **متوسط:** تنفيذ قائمة التحقق في [docs/VERIFICATION-CHECKLIST.md](VERIFICATION-CHECKLIST.md) (E2E يدوي) على البيئة المنشورة.
4. **لاحقاً:** تقليل تحذيرات البناء حسب [docs/VERCEL-BUILD-WARNINGS-PLAN.md](VERCEL-BUILD-WARNINGS-PLAN.md)، وترقية ESLint عند ترقية Next.js.

### 6.3 ملخص الحالة

- **البنية والكود:** متوافقة مع النشر على Vercel و Supabase؛ المصادقة والصلاحيات منظمة؛ سير الطلب موثّق ومطابق للكود.
- **الإشكاليات المعروفة:** معظمها موثّق وحُلّ (503، 429، 405، 500 رفع، 500 رسائل/تعديلات). المتبقي: توحيد معالجة `params` في باقي المسارات الديناميكية، والتحقق اليدوي من الإعدادات و E2E على Vercel.

بعد تنفيذ التحقق خطوة بخطوة (القسم 4) ومعالجة مسارات الـ params (القسم 5.2 أ)، يكون المشروع في وضع آمن ومنظّم للنشر والمتابعة.
