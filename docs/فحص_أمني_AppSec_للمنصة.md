# فحص أمني (AppSec) — منصة فكرة

فحص أمني (AppSec) للكود والمنطق: التحقق من المدخلات والتنظيف، XSS، أمان قاعدة البيانات، SQL Injection، RLS، حماية API (Rate Limiting، IDOR، CSRF)، ومعالجة الأخطاء. المخرجات: قائمة ثغرات مصنفة حسب الخطورة وكود مصحح مقترح.

---

## 1. فحص المدخلات (Input Validation & Sanitization)

### 1.1 استخدام Zod والتحقق من الطلبات

- **الوضع الحالي:** معظم مسارات الـ API التي تقبل body تستخدم **Zod** لتحقق من المدخلات: app/api/auth/register/route.ts، app/api/messages/[orderId]/route.ts، app/api/revisions/create/route.ts، app/api/payments/create/route.ts، app/api/orders/create/route.ts (عبر schemas/orderFormSchema.ts)، إلخ. إنشاء الطلب يستخدم createOrderSchema مع formData مُعرّف بشكل صارم في orderFormDataSchema.
- **ثغرة محتملة (Low):** في app/api/admin/users/route.ts المعامل role يُستخرج من query دون التحقق بـ Zod. **التوصية:** التحقق من role بـ z.enum أو رفض القيم غير المعروفة.
- **ثغرة محتملة (Medium):** معاملات page و limit في قوائم الطلبات تُستخرج بـ parseInt دون تحقق؛ قيم غير رقمية تؤدي لـ NaN. **التوصية:** استخدام Zod لـ query (مثلاً z.coerce.number().int().min(1).max(100) لـ limit).

### 1.2 XSS وتنظيف النصوص

- **الوضع الحالي:** lib/sanitize.ts يوفّر sanitizeText، sanitizeHtml (DOMPurify)، و sanitizeForDisplay. الرسائل: يُستدعى sanitizeText قبل الحفظ في مسارات الرسائل. عرض المحتوى عبر React (نص عادي)؛ لا dangerouslySetInnerHTML لمحتوى المستخدم. app/layout.tsx يستخدم dangerouslySetInnerHTML لسكربت ثابت (theme) — آمن.
- **توصية (Low):** توحيد sanitizeText مع DOMPurify بدلاً من الاعتماد على regex فقط.

### 1.3 نوع وطول وتنسيق المدخلات

- **توصية:** إضافة .max(10000) لمحتوى الرسالة في postMessageSchema و sendMessageSchema.
- **رابط وسائل التواصل (admin):** footer.socialLinks[].url مُعرّف كـ z.string() بدون تحقق من البروتوكول — خطر XSS (Medium) إن عُرض كـ href. **التوصية:** التحقق من أن url يبدأ بـ https:// أو http:// أو يكون فارغاً/`#` فقط.

---

## 2. أمن قاعدة البيانات (Database Security)

### 2.1 SQL Injection

- **الوضع الحالي:** استعلامات التطبيق عبر Prisma (مُعلمة)؛ لا $queryRawUnsafe/$executeRawUnsafe مع مدخلات الطلب في API. health route يستخدم $queryRaw استعلام ثابت — آمن. سكربتات scripts/ تستخدم $executeRawUnsafe على سلاسل ثابتة فقط.
- **الخلاصة:** لا ثغرة SQL Injection في مسارات الـ API.

### 2.2 RLS و Supabase

- البيانات تُدار عبر Prisma + PostgreSQL؛ التفويض في طبقة API. إن تم لاحقاً تعريض جداول Supabase للعميل، يجب إضافة RLS يطابق منطق التحقق الحالي.

---

## 3. حماية الـ API والمسارات (API Security)

### 3.1 Rate Limiting

- **الوضع الحالي:** middleware يطبّق حد معدل: مسارات المصادقة 10 طلبات/دقيقة؛ API عام 2000/15 دقيقة؛ مسارات الاست轮询 غير محدودة. التخزين في الذاكرة (lib/rateLimit.ts).
- **توصية:** للإنتاج استخدام مخزن موزع (مثل Redis).

### 3.2 IDOR (Insecure Direct Object Reference)

- **ثغرة حرجة:** في GET app/api/orders/[id]/route.ts لا يوجد تحقق للمهندس: أي مهندس يمكنه طلب تفاصيل أي طلب بتغيير id والحصول على بيانات العميل والطلب. **خطورة: High/Critical.**

**كود مصحح مقترح لـ GET /api/orders/[id]:**

```ts
if (auth.role === 'ADMIN') {
  // allow
} else if (auth.role === 'ENGINEER') {
  if (order.engineerId != null && order.engineerId !== auth.userId) {
    return Response.json(
      { success: false, error: 'غير مصرح' },
      { status: 403 }
    )
  }
} else {
  if (order.clientId !== auth.userId) {
    return Response.json(
      { success: false, error: 'غير مصرح' },
      { status: 403 }
    )
  }
}
```

- باقي المسارات (messages، plans، revisions، payments، download) تتحقق من clientId/engineerId/ADMIN بشكل صحيح.

### 3.3 CSRF Protection

- الاعتماد على same-origin و SameSite للكوكي؛ لا رموز CSRF صريحة. **توصية (Informational):** توثيق أن التطبيق same-origin؛ إن فُتح الـ API لنطاق آخر يُنظر في CSRF أو Bearer token.

---

## 4. معالجة الأخطاء (Safe Error Handling)

- **الوضع الحالي:** lib/errors.ts — في الإنتاج لا يُرجع errorId/code. **استثناء:** حالة P2021 تعرض نصاً يتضمن أمر سكربت داخلي ("نفّذ: npx tsx scripts/...") — تسريب معلومات تقنية (Low/Medium). **توصية:** عرض الرسالة التفصيلية فقط في development.

**كود مصحح مقترح لـ P2021:**

```ts
case 'P2021':
  return Response.json(
    {
      success: false,
      error:
        process.env.NODE_ENV === 'development'
          ? 'جدول غير موجود في قاعدة البيانات. نفّذ: npx tsx scripts/ensure-homepage-content-table.ts'
          : 'حدث خطأ في قاعدة البيانات',
      ...(process.env.NODE_ENV === 'development' && { errorId, code: error.code }),
    },
    { status: 500 }
  )
```

---

## 5. قائمة الثغرات مصنفة حسب الخطورة

| الخطورة | الوصف | الموقع |
|--------|--------|--------|
| **Critical/High** | IDOR: مهندس يمكنه عرض تفاصيل أي طلب (بما فيها بيانات العميل) بتغيير معرف الطلب في GET /api/orders/[id]. | app/api/orders/[id]/route.ts |
| **Medium** | عدم التحقق من بروتوكول روابط وسائل التواصل (footer.socialLinks[].url) قد يسمح بـ javascript: أو data: ويؤدي لـ XSS. | app/api/admin/content/homepage/route.ts |
| **Medium** | معاملات page/limit في قوائم الطلبات دون تحقق Zod؛ قيم غير رقمية تؤدي لـ NaN. | admin/orders، engineer/orders، my-orders |
| **Medium** | رسالة خطأ P2021 تعرض أمر سكربت داخلي للمستخدم في كل البيئات. | lib/errors.ts |
| **Low** | معامل role في GET /api/admin/users غير مُتحقق منه. | app/api/admin/users/route.ts |
| **Low** | عدم وجود حد أقصى لطول محتوى الرسالة في schema. | postMessageSchema، sendMessageSchema |
| **Low** | sanitizeText يعتمد على regex فقط؛ توحيد مع DOMPurify. | lib/sanitize.ts |
| **Informational** | Rate limiting في الذاكرة؛ في بيئة متعددة النسخ الحد غير موحد. | lib/rateLimit.ts |
| **Informational** | لا حماية CSRF صريحة؛ الاعتماد على same-origin و SameSite. | lib/api.ts، NextAuth/Supabase |

---

## 6. كود مصحح للدوال المتأثرة

### 6.1 إصلاح IDOR في GET /api/orders/[id]

في app/api/orders/[id]/route.ts استبدال كتلة "Check access" (السطور 62–70) بالكود المبين في القسم 3.2 أعلاه.

### 6.2 إصلاح رسالة P2021 في handleApiError

في lib/errors.ts استبدال case 'P2021' بالكود المبين في القسم 4 أعلاه.

### 6.3 التحقق من query في admin/users (role)

بعد requireAdmin:

```ts
const roleParam = request.nextUrl.searchParams.get('role')
const role = roleParam === 'CLIENT' || roleParam === 'ENGINEER' || roleParam === 'ADMIN'
  ? roleParam
  : undefined
const whereClause = role ? { role } : {}
```

### 6.4 حد أقصى لطول محتوى الرسالة

في مسارات الرسائل (postMessageSchema و sendMessageSchema):

```ts
content: z.string().min(1, 'محتوى الرسالة مطلوب').max(10000, 'الرسالة طويلة جداً')
```

### 6.5 التحقق من روابط وسائل التواصل (homepage)

في homepageContentSchema (app/api/admin/content/homepage/route.ts):

```ts
url: z.string().max(2000).refine(
  (v) => !v || v === '#' || v.startsWith('https://') || v.startsWith('http://'),
  { message: 'الرابط يجب أن يبدأ بـ https:// أو http://' }
)
```

---

## 7. ملخص الملفات المرجعية

| الغرض | الملف |
|--------|--------|
| التحقق من المدخلات (Zod) | schemas/orderFormSchema.ts، مسارات API المختلفة |
| التنظيف (XSS) | lib/sanitize.ts، app/api/messages (sanitizeText) |
| معالجة الأخطاء | lib/errors.ts |
| حد المعدل | lib/rateLimit.ts، middleware.ts |
| تفويض وفحص الوصول للطلب | app/api/orders/[id]/route.ts، app/api/messages، app/api/plans، app/api/revisions |
