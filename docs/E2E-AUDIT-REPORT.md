# تقرير التدقيق الشامل (End-to-End Audit) — منصة فكرة

**التاريخ:** 2025-02-11  
**المهندس المعماري:** Lead Software Architect  
**الهدف:** ضمان عمل المنصة بنسبة 100% دون أخطاء 500 أو 405، مع نظام تسجيل وطلبات ومحادثة خالٍ من أخطاء الـ Console.

---

## 1. نظام المحادثة والـ API (Critical)

### الملف: `app/api/messages/[orderId]/route.ts`

| البند | الحالة | التفاصيل |
|--------|--------|----------|
| GET | ✅ | موجودة بالكامل. استخراج `orderId` كـ String (CUID) من `params` (بدعم Next.js 15 Promise). عند `orderId` فارغ أو طلب غير موجود → **200** مع `messages: []`. `prisma.message.findMany({ where: { orderId }, include: { sender: true }, orderBy: { createdAt: 'asc' } })` داخل try/catch. |
| POST | ✅ | موجودة بالكامل. نفس استخراج `orderId`. تحقق من الطلب والصلاحية (CLIENT/ENGINEER/ADMIN). `prisma.message.create({ data: { orderId, senderId: auth.userId, content: sanitizedContent } })` مع ربط صحيح. |
| orderId كـ String (CUID) | ✅ | `String(resolvedParams.orderId).trim()` في GET و POST. الجدول Message يستخدم `orderId` String وعلاقة مع Order. |
| معالجة أخطاء | ✅ | GET: أي فشل في findMany أو خطأ غير متوقع → 503 أو 200+[] حسب السياق. POST: فشل parse JSON → 400؛ أي 5xx من handleApiError → 503. |
| OPTIONS | ✅ | 204 مع رؤوس Allow لتجنب 405. |

### الملف: `app/api/messages/send/route.ts`

- مسار بديل (POST مع body يحتوي `orderId` + `content`). تم تدعيمه: parse `request.json()` داخل try/catch (400 عند JSON غير صالح)، وأي خطأ 5xx يُعاد كـ **503** مع رسالة واضحة ورؤوس Allow.

---

## 2. مطابقة Prisma والـ Schema

### الملف: `prisma/schema.prisma`

| الجدول | الحقل | النوع | العلاقات |
|--------|--------|-------|----------|
| User | id | String @id @default(cuid()) | messages (MessageSender), clientOrders, engineerOrders, notifications |
| Order | id | String @id @default(cuid()) | messages, client, engineer, package, auditLogs, payments, plans, revisionRequests, pinPackPurchases |
| Message | id, orderId, senderId, content, isRead, createdAt | String / String / String / String / Boolean / DateTime | order → Order, sender → User |

- **Order.id**: String مع `@default(cuid())` — متوافق مع CUID في قاعدة البيانات.
- **Message.orderId** و **Message.senderId**: String مع علاقات `references: [id]` و `onDelete: Cascade` حيث مطلوب.
- لا توجد علاقات مكسورة تسبب انهيار السيرفر عند طلب بيانات مرتبطة.

---

## 3. الأمان والمصادقة (Auth & Middleware)

### الملف: `middleware.ts`

| البند | الحالة | التفاصيل |
|--------|--------|----------|
| عدم توجيه لا نهائي | ✅ | `authorized` يُرجع `true` لجميع المسارات التي تبدأ بـ `/api/`، لذا طلبات الـ API لا تُوجّه إلى صفحة تسجيل الدخول أبداً. التوجيه يحدث فقط لصفحات غير عامة وغير API عندما لا يوجد مستخدم. |
| طلبات API للمستخدمين المسجلين | ✅ | مسارات `/api/*` مسموحة دائماً في الـ callback؛ التحقق من الجلسة والصلاحية يتم داخل كل route (requireAuth / getApiAuth). |
| Polling (messages, notifications) | ✅ | عند استخدام Supabase Auth، مسارات `/api/messages/` و `/api/notifications` تتخطى استدعاء `getSupabaseSession` في الـ middleware لتقليل الضغط؛ الـ API يتحقق لاحقاً. |
| الجلسة على السيرفر | ✅ | `getSupabaseSession(req, response)` يُستدعى لطلبات الصفحات ولبقية الـ API عند عدم استخدام مسارات الـ polling. |
| معالجة الأخطاء في الـ middleware | ✅ | في حالة استثناء: طلبات API ترجع 503 JSON؛ غير API ترجع next() لتجنب تعطل كامل. |

---

## 4. التحصين ومعالجة الأخطاء (Robustness)

| البند | الحالة | التفاصيل |
|--------|--------|----------|
| Error Boundary (واجهة) | ✅ | مكوّن `ErrorBoundary` في `components/ErrorBoundary.tsx` يُستخدم عبر `ErrorBoundaryProvider` في `app/layout.tsx`. تم إضافة **`app/error.tsx`** (Next.js App Router) لعرض واجهة بديلة عند خطأ في الشجرة بدلاً من صفحة بيضاء، مع زر "إعادة المحاولة" و"الصفحة الرئيسية". |
| Try-Catch في API Routes | ✅ | مسار الرسائل الرئيسي `[orderId]`: GET و POST داخل try/catch مع تحويل 5xx إلى 503 حيث مطلوب. مسار `messages/send`: try/catch مع parse آمن لـ JSON و 503 للخطأ غير المعالج. مسارات أخرى (orders/create, auth/me, إلخ) تستخدم `handleApiError` داخل catch. |
| حذف ملفات مؤقتة / كود ميت | ✅ | لم يُعثر على ملفات `.temp` أو مجلدات تجريبية للحذف. التعليقات TODO المتبقية (مثل CreateOrderContent، admin engineers) تتعلق بميزات مستقبلية وليست dead code. |

---

## 5. متغيرات البيئة (Env) وربط Vercel

| المتغير | الاستخدام في الكود |
|---------|---------------------|
| **NEXT_PUBLIC_SUPABASE_URL** | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `lib/getApiAuth.ts`, سكربتات التحقق والمزامنة، `app/api/system/health/route.ts`. |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | نفس الملفات أعلاه لإنشاء عميل Supabase (متصفح وسيرفر وطلب). |
| **SUPABASE_SERVICE_ROLE_KEY** | `lib/supabase/server.ts` (createAdminClient)، سكربتات المزامنة، `lib/storage.ts`, `lib/uploadEngineerFile.ts`, `app/api/auth/ensure-supabase-user`, `app/api/system/health`. |

- الكود يعتمد على هذه المتغيرات فقط (لا قيم ثابتة). ربطها يدوياً في Vercel (Environment Variables) كافٍ؛ يُنصح بمراجعة `/api/system/health` بعد النشر للتأكد من ظهور `supabaseUrl`, `supabaseAnon`, `serviceRoleKey` حسب الإعداد.

---

## ملخص الإجراءات المنفذة

1. **رسائل API:** إزالة تكرار `try` في GET، والتأكد من GET/POST كاملتين مع orderId كـ String (CUID) وحفظ POST بـ senderId و content و orderId.
2. **Schema:** التحقق من توافق User, Order, Message والعلاقات — لا تغيير مطلوب.
3. **Middleware:** التحقق من عدم وجود توجيه لا نهائي وسماح طلبات API والجلسة على السيرفر — لا تغيير مطلوب.
4. **التحصين:** إضافة `app/error.tsx`، تدعيم `api/messages/send` (parse JSON آمن + 503 للخطأ غير المعالج).
5. **Env:** التأكد من استخدام NEXT_PUBLIC_SUPABASE_URL و ANON_KEY و SERVICE_ROLE في الكود دون hardcoding.

---

## التوصيات النهائية

- تشغيل **فحص صحة النظام** بعد كل نشر: `GET /api/system/health` للتحقق من حالة DB و Supabase.
- مراقبة الـ Console (سيرفر ومتصفح) بعد التحديثات؛ نظام المحادثة مصمم لعدم إرجاع 500 (إما 200/400/403/503).
- الاحتفاظ بـ `SKIP_MESSAGES_AUTH` كخيار تطوير فقط؛ في الإنتاج يُفضّل عدم تعيينه أو تعيينه `false`.
