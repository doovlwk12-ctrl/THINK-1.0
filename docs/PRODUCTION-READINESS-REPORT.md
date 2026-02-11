# تقرير الجاهزية للإنتاج (Production Readiness) — منصة فكرة

**التاريخ:** 2025-02-11  
**المهندس:** Lead Engineer  
**الهدف:** فحص نهائي شامل لضمان جاهزية المشروع للرفع على Vercel.

---

## 1. ملفات الـ API والمزامنة مع Prisma

### 1.1 معالجة الأخطاء (لا إرجاع 500 عام)

| الإجراء | التفاصيل |
|---------|----------|
| **مراجعة مسارات الـ API** | تم فحص جميع ملفات `route.ts` في `app/api`. |
| **استبدال 500 بـ 503** | تم استبدال أي رد بـ `status: 500` بردود **503** مع رسالة مناسبة للمستخدم في المسارات التالية: |
| | • `app/api/users/profile/route.ts` — فشل تحديث كلمة المرور (Supabase) |
| | • `app/api/admin/engineers/applications/route.ts` — عدم وجود موديل EngineerApplication في Prisma |
| | • `app/api/admin/engineers/invite/route.ts` — نفس الحالة |
| | • `app/api/auth/register/route.ts` — فشل إنشاء حساب (Supabase user) |
| | • `app/api/engineer/applications/[token]/route.ts` — خطأ نظام (موضعان) |
| | • `app/api/admin/engineers/applications/[id]/approve/route.ts` |
| | • `app/api/admin/engineers/applications/[id]/reject/route.ts` |
| | • `app/api/orders/[id]/buy-pin-pack/route.ts` — إعدادات PinPack غير متوفرة |
| **Try-Catch** | جميع المسارات التي تم فحصها إما داخل `try/catch` أو تستخدم `handleApiError` في الـ catch؛ المسارات الجديدة (مثل `/api/chat/*`) ترجع 503 في الـ catch. |

### 1.2 أسماء الحقول و Prisma

- **المصدر:** `prisma/schema.prisma` (مطابق لآخر `prisma generate` ويفترض مزامنته مع DB عبر `db pull` أو `migrate`).
- **الجداول الأساسية:** User (id, email, password, name, phone, role, …), Order (id, orderNumber, clientId, engineerId, packageId, status, formData, remainingRevisions, deadline, …), Message (id, orderId, senderId, content, isRead, createdAt).
- **الاستعلامات:** استعلامات Prisma في المشروع تستخدم أسماء الحقول من الـ schema (مثل `orderId`, `senderId`, `clientId`, `engineerId`). يُنصح بعد أي تغيير في قاعدة البيانات تشغيل `npx prisma db pull` ثم `npx prisma generate` والتأكد من عدم وجود أخطاء في الـ build.

---

## 2. تنظيف المشروع (Project Cleanup)

| البند | النتيجة |
|--------|---------|
| **ملفات .temp** | لا توجد ملفات تطابق `*.temp*` في المشروع. |
| **ملفات Log محلية** | لا توجد ملفات `*.log` في المشروع. |
| **مكونات غير مستخدمة** | تم التحقق: المكونات في `components/` (مثل ModificationPointMessage, ArchitecturalIcons, NotificationBell, Loading, ErrorBoundary, Header, إلخ) مستخدمة في الصفحات أو الـ layout. |
| **مجلد public** | فارغ؛ لا توجد صور أو أيقونات غير مستخدمة في public. |
| **ملفات ميتة** | لم يُعثر على مكونات أو صفحات لا يُستدعى استيرادها. |

---

## 3. نظام المحادثة (Realtime + Polling)

| البند | الحالة |
|--------|--------|
| **عدم ازدواجية الرسائل** | في `hooks/useOrderChat.ts`: استجابة الـ **Polling** (غير التحميل الأولي) تُدمَج مع الرسائل الحالية عبر **`mergeMessagesById`** (دمج حسب `id`، ترتيب حسب `createdAt`). رسائل Realtime تُضاف فقط إن لم تكن موجودة: `prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]`. |
| **تنظيف قناة Realtime (Unsubscribe)** | في `useEffect` الخاص بـ Realtime، دالة الـ **cleanup** تستدعي `channelRef.current = null` ثم **`supabase.removeChannel(channel)`** عند Unmount أو تغيير `orderId`/`enabled`، مما يمنع بقاء اتصالات مفتوحة ويقلل استهلاك الذاكرة. |
| **إرسال البث (Broadcast)** | عند الإرسال يُستخدم `channelRef.current` إن وُجد؛ وإلا قناة مؤقتة ثم **`supabase.removeChannel(tempCh)`** فوراً. |

---

## 4. الأمان والتحقق

### 4.1 عدم تسريب المفاتيح السرية للواجهة

| المتغير | الاستخدام |
|---------|-----------|
| **SUPABASE_SERVICE_ROLE_KEY** | مستخدم فقط في سيرفر/API: `lib/supabase/server.ts`, `lib/storage.ts`, `lib/uploadEngineerFile.ts`, `app/api/auth/ensure-supabase-user`, `app/api/system/health`, سكربتات. **لا يظهر في أي مكوّن عميل (client component) أو كود يُرسل للمتصفح.** |
| **NEXTAUTH_SECRET** | مستخدم في `lib/auth.ts` وسيرفر NextAuth فقط. لا يُعرّض للواجهة. |
| **NEXT_PUBLIC_*** | فقط `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_USE_SUPABASE_AUTH` (وإن وُجد `NEXT_PUBLIC_APP_URL`) — وهي مناسبة للعميل ولا تُعتبر أسراراً. |

### 4.2 سياسات RLS (Supabase)

- **التغطية المطلوبة:** في Supabase SQL Editor يُنصح بالتحقق من تفعيل **RLS** على الجداول الأساسية التي تتعامل معها التطبيق عبر Supabase (إن وُجدت في مشروع Supabase وليست فقط عبر Prisma):
  - **User** (إن كان الوصول يتم عبر Supabase وليس فقط عبر API بالمصادقة).
  - **Order** (إن تم التعامل معه من العميل عبر Supabase).
  - **Message** (إن تم استخدام Realtime أو واجهة مباشرة على الجدول).
- **ملاحظة:** المشروع الحالي يخزن البيانات أساساً عبر **Prisma + PostgreSQL**؛ واجهة المحادثة تستخدم **API routes** (`/api/chat/messages`, `/api/chat/send`) و **Supabase Realtime (Broadcast)** فقط. إن كانت جداول Message/Order/User في Supabase أيضاً، يجب تطبيق RLS هناك حسب نموذج الصلاحيات (عميل/مهندس/أدمن).

---

## 5. تجربة المستخدم (UX) — التحميل

| البند | الحالة |
|--------|--------|
| **مكوّن Loading** | يوجد `components/shared/Loading.tsx` ويُستخدم في أغلب الصفحات التي تجلب بيانات. |
| **loading.tsx (Next.js)** | موجود لمسارات مثل `app/admin/orders/loading.tsx`, `app/(client)/orders/[id]/loading.tsx`, وغيرها حيث يُفترض وجود تحميل للصفحة. |
| **حالات التحميل في المحادثة** | صفحتا المحادثة (عميل ومهندس) تعرضان `<Loading text="جاري التحميل..." />` عند `loading && messages.length === 0`، وزر إعادة المحاولة مع تحميل، و**Loader2** (spinner) أثناء `fetchingMore`. |
| **صفحات أخرى** | لوحة المهندس، طلبات الأدمن، إعدادات المراجعات، شراء الدبابيس، صفحة التعديل، إلخ تستخدم `Loading` أو حالة `loading` لمنع شاشة فارغة. |

---

## 6. ملخص الإجراءات المنفذة

1. **API:** استبدال جميع ردود **500** ب**503** مع رسائل مناسبة في المسارات المذكورة أعلاه؛ التأكد من وجود try-catch أو handleApiError.
2. **تنظيف:** التحقق من عدم وجود ملفات .temp أو .log محلية؛ التحقق من استخدام المكونات والصور.
3. **المحادثة:** التأكد من دمج Polling مع Realtime بدون تكرار، وعمل **removeChannel** في cleanup.
4. **الأمان:** التأكد من عدم استخدام SERVICE_ROLE أو NEXTAUTH_SECRET في الواجهة؛ توثيق الحاجة إلى RLS في Supabase للجداول الأساسية.
5. **UX:** التأكد من استخدام Loading/loading.tsx/Loader2 في المسارات الحرجة.

---

## 7. التوصيات قبل الرفع النهائي على Vercel

- تشغيل **`npm run build`** محلياً والتأكد من عدم وجود أخطاء.
- التأكد من ضبط **متغيرات البيئة** على Vercel: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, ووفق الإعداد: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- إن كانت جداول Supabase (User/Order/Message) مستخدمة من واجهة أو Realtime، مراجعة **RLS** في SQL Editor.
- بعد النشر، اختبار **تسجيل الدخول، إنشاء طلب، والمحادثة** على البيئة الحية.

المشروع جاهز للرفع النهائي على Vercel بعد تطبيق التوصيات أعلاه.
