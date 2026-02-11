# فحص مسارات المحادثة والأخطاء (500 / 503)

## الهدف
منع ظهور **500 (Internal Server Error)** من واجهة الرسائل، وضمان معالجة آمنة للأخطاء في كل المسارات المرتبطة بالمحادثة.

---

## 1. مسار API الرسائل

**الملف:** `app/api/messages/[orderId]/route.ts`

### GET (جلب الرسائل)
- **معامل `context`:** اختياري؛ استخدام `context?.params ?? {}` مع `Promise.resolve(...).catch(() => ({}))` لتجنب أي استثناء من Next.js.
- **المصادقة:** `requireAuth(request)` — إن فشل أو رجع 503 يُعاد كما هو.
- **الوصول للطلب:** فحص `order` و `clientId` / `engineerId` حسب الدور (ADMIN / ENGINEER / CLIENT).
- **قاعدة البيانات:** `prisma.order.findUnique` و `prisma.message.findMany` — أي استثناء يُلتقط في الـ catch.
- **تحويل 5xx → 503:** في الـ catch الداخلي: `handleApiError` إن رجع `status >= 500` نرمي ثم نرجع `Response.json(..., 503)`.
- **غلاف خارجي:** `try { try { ... } catch (error) { ... } } catch (outer) { return 503 }` — أي استثناء غير متوقع (مثلاً من الـ catch الداخلي) يُحوَّل إلى **503** وليس 500.
- **تسجيل:** `console.error('[messages GET]', ...)` واختيارياً `[messages GET outer]`.

### POST (إرسال رسالة)
- نفس تأمين `context` و `requireAuth`.
- تحقق من صلاحية الطلب (غير منتهي) والوصول.
- **تحويل 5xx → 503:** استدعاء `handleApiError` داخل `try/catch`؛ إن النتيجة 5xx أو حصل استثناء نرجع 503 مع رسالة ثابتة.
- تسجيل: `console.error('[messages POST]', ...)`.

### OPTIONS
- يرجع 204 بدون استثناءات.

---

## 2. المصادقة

**الملفات:** `lib/requireAuth.ts`, `lib/getApiAuth.ts`

- **requireAuth:** استدعاء `getApiAuth` داخل `try/catch`؛ عند أي استثناء يُرجَع **503** مع رسالة فشل التحقق من الجلسة (لا يرمي للخارج).
- **getApiAuth:** الجسم كله داخل `try/catch`؛ عند أي استثناء يُرجَع `null` (لا يرمي).

بهذا لا يتحول فشل المصادقة إلى 500 من مسار الرسائل.

---

## 3. الواجهة الأمامية (المحادثة)

**الملف:** `hooks/useOrderChat.ts`

- **التكرار (polling):** عداد `consecutiveFailuresRef` — عند **3 فشل متتالي** يُوقَف الـ polling.
- **الطلب الأولي:** إن فشل الطلب الأول (`isInitial === true`) يُوقَف الـ polling فوراً.
- **إعادة المحاولة:** عند استدعاء `fetchMessages(true)` (مثل زر "إعادة المحاولة") يُصفَّر العداد وتُعاد تشغيل الـ interval.

**صفحات المحادثة:**
- العميل: `app/(client)/orders/[id]/chat/page.tsx`
- المهندس: `app/engineer/orders/[id]/chat/page.tsx`

كلاهما يعتمد على `useOrderChat` وواجهة `api.get`/`api.post` من `lib/api.ts`.

---

## 4. استدعاء API من العميل

**الملف:** `lib/api.ts`

- عند `!response.ok` يُرمى استثناء مع `err.status = response.status`.
- الواجهة تعرض رسالة مناسبة (مثل "خطأ في الخادم" لـ 500/503) وتوفّر زر إعادة المحاولة.

---

## 5. تدفق الطلب من المتصفح حتى الرد

1. **المتصفح:** طلب `GET /api/messages/{orderId}` (أو من الـ polling في `useOrderChat`).
2. **Next.js:** توجيه إلى `app/api/messages/[orderId]/route.ts` → `GET`.
3. **GET:** غلاف خارجي `try/catch` → غلاف داخلي `try/catch`:
   - `requireAuth` → إن فشل: 401/403/503 من `requireAuth`.
   - استخراج `orderId` من `context?.params` بشكل آمن.
   - Prisma: `findUnique` / `findMany` — أي خطأ يُلتقط في الـ catch الداخلي.
   - الـ catch الداخلي: تحويل 5xx إلى 503، تسجيل، ثم `return Response.json(..., 503)`.
   - الـ catch الخارجي: أي استثناء آخر → 503.
4. **العميل:** `lib/api` يقرأ `response.status`؛ إن كان 503 أو 500 يعرض رسالة خطأ وزر إعادة المحاولة.
5. **useOrderChat:** يعدّ الفشل المتتالي ويوقف الـ polling بعد 3 مرات؛ إعادة المحاولة تصفّر العداد.

---

## 6. ماذا تفعل إذا استمر ظهور 500 في المتصفح؟

1. **التأكد من النشر:** أن آخر تعديلاتك (بما فيها غلاف الـ 503 في مسار الرسائل) مرفوعة ومُبنية على Vercel (مثلاً من فرع `main`).
2. **إعادة النشر:** إعادة deploy للمشروع على Vercel بعد الـ push.
3. **السجلات:** في Vercel (أو في الدالة) ابحث عن `[messages GET]` أو `[messages GET outer]` لمعرفة السبب الحقيقي للخطأ.

---

## 7. ملخص الحالات التي لا يجب أن تنتج 500 من هذا المسار

| المصدر              | التعامل |
|---------------------|---------|
| فشل `requireAuth`   | 503 من requireAuth |
| استثناء من `context.params` | غلاف آمن + catch خارجي → 503 |
| خطأ Prisma          | catch داخلي → 503 |
| `handleApiError` يرجع 5xx | catch → تحويل إلى 503 |
| أي استثناء آخر داخل GET | catch خارجي → 503 |
| نفس المنطق في POST  | تحويل 5xx إلى 503 داخل catch |

تم التوثيق في: `docs/CHAT-MESSAGES-AUDIT.md`
