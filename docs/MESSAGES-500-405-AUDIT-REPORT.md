# تقرير تدقيق أخطاء المحادثة 500 و 405 — منصة فكرة

**التاريخ:** 2025-02-11  
**الملخص:** تحليل أسباب خطأ **500 (GET)** و **405 (Method Not Allowed) (POST)** على `/api/messages/[orderId]` وربطها بالمشروع وقاعدة البيانات وSupabase، مع ترتيب الأسباب من الأعلى إلى الأقل، وسيناريوهات وإصلاحات مطبّقة.

---

## 1. ملخص الأخطاء الظاهرة

| الخطأ | المسار | الوصف |
|--------|--------|--------|
| **500** | `GET /api/messages/cmlhid9yv0001b1t616gk1jzm` | فشل تحميل المورد — استجابة 500 من الخادم |
| **405** | `POST /api/messages/cmlhid9yv0001b1t616gk1jzm` | Method Not Allowed (الطريقة غير مسموحة) |

النتيجة في الواجهة: "فشل تحليل استجابة الخادم" و "تعذر الاتصال بالخادم"، وزر "إعادة المحاولة".

---

## 1.1 السبب الفعلي من سجلات Vercel (ERR_REQUIRE_ESM)

في سجلات Runtime Logs على Vercel يظهر الخطأ:

- **`[ERR_REQUIRE_ESM]: require() of ES Module ... @exodus/bytes/encoding-lite.js from html-encoding-sniffer not supported`**
- **FUNCTION_INVOCATION_FAILED** للطلب (GET 500 و POST 405).

**السبب:** مسار `/api/messages/[orderId]` كان يستورد `sanitizeText` من `@/lib/sanitize`. ملف `sanitize.ts` يستورد `isomorphic-dompurify` في بداية الملف، وهذا يسحب `html-encoding-sniffer` ثم `@exodus/bytes` (وحدة ESM فقط). على بيئة Vercel Serverless يتم استخدام `require()` لتحميل السلسلة، فيفشل التحميل قبل تنفيذ الـ handler فيُرجع 500/405.

**الإصلاح المطبّق:** إنشاء وحدة خفيفة `lib/sanitizeText.ts` تحتوي فقط على دالة `sanitizeText` (نفس المنطق بنظام regex، بدون أي استيراد لـ DOMPurify). استبدال استيراد مساري الرسائل من `@/lib/sanitize` إلى `@/lib/sanitizeText`. بهذا لا يُحمّل مسار الرسائل `isomorphic-dompurify` ولا يحدث ERR_REQUIRE_ESM.

---

## 2. ترتيب الأسباب (من الأعلى إلى الأقل)

### خطأ 500 (GET)

| # | السبب | الوصف | تم التعامل؟ |
|---|--------|--------|-------------|
| 1 | **استثناء غير مُلتقط من Prisma (findUnique)** | عند فشل اتصال DB أو جدول غير موجود، `prisma.order.findUnique` يرمي استثناء. كان موجوداً خارج try/catch في GET فكان يصل إلى معالج الأخطاء العام ويُرجع 500. | ✅ تم لف استدعاء `findUnique` داخل try/catch وإرجاع 200 مع `messages: []` عند الفشل. |
| 2 | **متغيرات بيئة ناقصة على Vercel** | غياب أو خطأ `DATABASE_URL` أو `NEXT_PUBLIC_SUPABASE_*` يسبب فشل Prisma أو Supabase (مثلاً في `getApiAuth`/`requireAuth`) واستثناء غير مُعالج. | ✅ `requireAuth` يلتقط أي استثناء من `getApiAuth` ويرجع 503. تم تعزيز GET بحماية إضافية لـ findUnique. |
| 3 | **عدم تطابق Schema مع قاعدة البيانات** | لو جدول `Message` أو `Order` أو علاقاتهم غير مطابقة لـ `schema.prisma` (أسماء جداول/أعمدة مختلفة)، استعلام Prisma قد يرمي ويُنتج 500. | ✅ تم التحقق: Order.id و Message.orderId و senderId وعلاقاتهم مضبوطة. يُنصح بتشغيل `prisma db pull` أو `migrate deploy` على بيئة Vercel. |
| 4 | **فشل تسلسل (serialization) الـ sender** | لو `m.sender` كان null أو بنية غير متوقعة بعد `include: { sender: true }`، قد يحدث خطأ أثناء بناء الـ response. | ✅ الكود يستخدم `String(m.sender?.id ?? '')` وما شابه لتجنب الانهيار. |

### خطأ 405 (POST)

| # | السبب | الوصف | تم التعامل؟ |
|---|--------|--------|-------------|
| 1 | **تشغيل الـ Route على Edge أو تقسيم خاطئ للدوال** | على Vercel، إن تم تشغيل المسار كـ Edge أو إن البناء (build) لم يضمّن دالة POST بشكل صحيح للمسار الديناميكي، قد يُرجع البنية 405 لـ POST. | ✅ تم تعيين `export const runtime = 'nodejs'` لمسار الرسائل لضمان تشغيله على Node واعتراف كل من GET و POST. |
| 2 | **تخزين مؤقت أو CDN** | تخزين مؤقت لاستجابة قديمة (مثلاً GET فقط) أو قواعد في CDN/Proxy تقبل GET فقط للمسار. | يُنصح بمراجعة Vercel: عدم تخزين `/api/messages/*` مؤقتاً (المسار مضبوط بالفعل على `dynamic = 'force-dynamic'`). |
| 3 | **نسخة قديمة من المشروع منشورة** | إن لم يكن آخر commit (الذي فيه تصدير POST و runtime) منشوراً على Vercel، سيبقى السلوك القديم (405). | يُنصح بإعادة النشر (Redeploy) بعد دمج الإصلاحات. |

---

## 3. سيناريوهات مرتبطة بالمشروع

| السيناريو | مخرجات محتملة | التوصية |
|------------|----------------|----------|
| مستخدم مسجّل (Supabase) يفتح صفحة محادثة الطلب | GET يُستدعى → requireAuth → getApiAuth. إن انقطع الاتصال بـ Supabase أو DB → استثناء. | تم: requireAuth يلتقط ويرجع 503؛ GET يلتقط فشل findUnique ويرجع 200 + []. |
| نفس المستخدم يرسل رسالة (POST) | POST يُستدعى. إن الخادم لا يتعرّف على POST → 405. | تم: تعيين `runtime = 'nodejs'` ووجود تصدير POST صريح. إعادة النشر مطلوبة. |
| DB (Postgres) معطّل أو DATABASE_URL خاطئ | أي استعلام Prisma يرمي. | تم: try/catch لـ findUnique و findMany في GET؛ إرجاع 200+[] أو 503 بدل 500. |
| Supabase: URL أو ANON_KEY غير مضبوطين مع USE_SUPABASE_AUTH=true | createClientFromRequest يرمي. | تم: requireAuth يلتقط ويرجع 503. التأكد من ربط المتغيرات في Vercel. |
| جدول Message أو Order غير موجود في DB (بعد migrate جديد) | P2021 أو استثناء من Prisma. | تم: معالجة في handleApiError؛ GET إضافياً يلتقط فشل findUnique ويرجع 200+[]. |

---

## 4. ربط المسارات والواجهة

| المكوّن | المسار/الملف | الربط |
|---------|---------------|--------|
| واجهة المحادثة (عميل) | `app/(client)/orders/[id]/chat/page.tsx` | تستدعي `apiClient.get(\`/messages/${orderId}\`)` و `apiClient.post(\`/messages/${orderId}\`, { content })`. |
| واجهة المحادثة (مهندس) | `app/engineer/orders/[id]/chat/page.tsx` | نفس الاستدعاءات أعلاه. |
| الهوك | `hooks/useOrderChat.ts` | يستدعي GET على `/messages/${orderId}` للـ polling. |
| مسار API الرسائل | `app/api/messages/[orderId]/route.ts` | GET و POST و OPTIONS؛ orderId يُستخرج من `params` كـ String (CUID). |
| مسار بديل للإرسال | `app/api/messages/send/route.ts` | POST مع body يحتوي orderId و content (الواجهة تستخدم `/messages/${orderId}` وليس `/messages/send`). |

لا يوجد تعارض في المسارات؛ لا يوجد مسار آخر يظلّل `/api/messages/[orderId]`.

---

## 5. قاعدة البيانات والأسماء

| البند | الحالة |
|--------|--------|
| **Order.id** | String، @default(cuid()) — متوافق مع CUID في الرابط (مثل cmlhid9yv0001b1t616gk1jzm). |
| **Message.orderId** | String، علاقة مع Order.id. |
| **Message.senderId** | String، علاقة مع User.id. |
| **User.id** | String، @default(cuid()). عند استخدام Supabase Auth قد يكون id المستخدم من Supabase (UUID) أو من Prisma (cuid) حسب المزامنة؛ getApiAuth يتعامل مع كلا الحالتين (مطابقة بالبريد). |

التوصية: التأكد من أن جميع migrations مطبّقة على قاعدة الإنتاج (`prisma migrate deploy` أو `db push` حسب السياسة)، وأن أسماء الجداول والأعمدة في DB تطابق الـ schema.

---

## 6. Supabase — توحيد الأسماء والمتغيرات

| المتغير | الاستخدام | التوحيد |
|----------|------------|---------|
| **NEXT_PUBLIC_SUPABASE_URL** | عميل المتصفح، السيرفر، الـ middleware. | يجب أن يكون نفس رابط المشروع من لوحة Supabase (Project URL). |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | نفس الملفات أعلاه. | من Project Settings → API → anon public. |
| **SUPABASE_SERVICE_ROLE_KEY** | عمليات سيرفر فقط (مثل ensure-supabase-user، storage). | من Project Settings → API → service_role. |

لا يوجد في الكود استخدام لأسماء مختلفة (مثل SUPABASE_URL بدل NEXT_PUBLIC_SUPABASE_URL) في المسارات الحرجة؛ السكربتات المساعدة قد تدعم كلا الاسمين للتوافق. التوصية: الاعتماد على الأسماء الموثّقة في `.env.example` وربطها يدوياً في Vercel.

---

## 7. الإصلاحات المطبّقة في الكود

1. **تعيين `runtime = 'nodejs'`** في `app/api/messages/[orderId]/route.ts` لضمان تشغيل المسار على Node وتجنب 405 بسبب Edge أو تقسيم الدوال.
2. **لف `prisma.order.findUnique` في GET داخل try/catch**: عند أي فشل (اتصال، جدول مفقود، إلخ) يتم إرجاع 200 مع `messages: []` بدلاً من ترك الاستثناء يصل إلى المعالج العام (500).
3. **الإبقاء على** `dynamic = 'force-dynamic'` وعدم تخزين استجابة المسار مؤقتاً.
4. **الإبقاء على** معالجة الأخطاء الحالية في GET و POST (تحويل أي 5xx إلى 503 في هذا المسار).

---

## 8. خطوات يُنصح بها بعد النشر

1. **إعادة النشر (Redeploy)** على Vercel بعد دمج هذه التغييرات حتى يُطبَّق `runtime = 'nodejs'` وتحديثات try/catch.
2. **التحقق من متغيرات البيئة على Vercel**: `DATABASE_URL`، `NEXT_PUBLIC_SUPABASE_URL`، `NEXT_PUBLIC_SUPABASE_ANON_KEY`، و`SUPABASE_SERVICE_ROLE_KEY` (حسب الحاجة)، ومطابقتها مع `.env.example`.
3. **تشغيل فحص الصحة**: `GET /api/system/health` للتحقق من حالة DB و Supabase.
4. **مراقبة السجلات (Logs)** على Vercel عند حدوث خطأ: البحث عن `[messages GET]` أو `[messages POST]` لتحديد أي استثناء متبقي.

---

## 9. خلاصة

- **500 GET**: تم تفسيره بأسباب مرتبطة بعدم التقاط استثناء من `findUnique` ومتغيرات البيئة وعدم تطابق Schema؛ تم تعزيز GET بحماية findUnique وتحويل أي 5xx إلى 503 في هذا المسار.
- **405 POST**: تم تفسيره بأسباب مرتبطة بالـ runtime والبناء على Vercel؛ تم تعيين `runtime = 'nodejs'` والتأكد من تصدير POST.
- قاعدة البيانات والـ schema وعلاقات Order/Message/User متوافقة مع الاستخدام الحالي؛ Supabase يعتمد على المتغيرات الموثّقة. إعادة النشر والتحقق من البيئة ومتابعة السجلات تكمل معالجة الأخطاء.
