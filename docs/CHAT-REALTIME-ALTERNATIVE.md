# المحادثة بنظام Realtime — الخطة البديلة

بسبب استمرار أخطاء 500 و 405 على `/api/messages/[orderId]` على Vercel، تم تنفيذ **خطة بديلة** تعتمد على مسارات API جديدة و Supabase Realtime.

---

## ما تم تنفيذه

### 1. مسارات API جديدة (بدون الاعتماد على المسار المعطوب)

| المسار | الوظيفة |
|--------|---------|
| **GET /api/chat/messages?orderId=xxx** | جلب رسائل الطلب. استيراد أدنى (prisma, getApiAuth) لتجنب ERR_REQUIRE_ESM. |
| **POST /api/chat/send** | إرسال رسالة. Body: `{ orderId, content }`. يستخدم `lib/sanitizeText` فقط. |

الملفات:
- `app/api/chat/messages/route.ts`
- `app/api/chat/send/route.ts`

### 2. Supabase Realtime

- **الاشتراك:** كل عميل يفتح محادثة طلب يشترك في قناة `order:${orderId}` (Broadcast).
- **الاستقبال:** عند استقبال حدث `broadcast` باسم `message` يُضاف المحتوى إلى قائمة الرسائل (بدون تكرار).
- **البث بعد الإرسال:** بعد نجاح POST إلى `/api/chat/send` يبث العميل الرسالة الجديدة على نفس القناة حتى يراها الطرف الآخر فوراً بدون انتظار الـ polling.

### 3. تغييرات الواجهة والهوك

- **`hooks/useOrderChat.ts`**: جلب الرسائل من `/api/chat/messages?orderId=...`، الاشتراك في قناة Realtime، وتصدير `broadcastMessage` لاستدعائها بعد الإرسال.
- **تنظيف (Cleanup) عند فك المكوّن:** في `useEffect` الخاص بـ Realtime، الدالة المُرجعة (cleanup) تستدعي `supabase.removeChannel(channel)` وتُصفّي `channelRef.current = null` عند Unmount أو تغيير `orderId`/`enabled`، لتفادي تسريب الذاكرة وترك اتصالات مفتوحة.
- **عدم تكرار الرسائل مع الـ Polling:** عند استجابة الـ Polling (غير التحميل الأولي) تُدمَج النتائج مع الرسائل الحالية عبر `mergeMessagesById` (دمج حسب `id` وترتيب حسب `createdAt`) حتى لا تُضاف رسائل مكررة إن كانت قد وصلت مسبقاً عبر Realtime.
- **صفحتا المحادثة (عميل ومهندس):** استدعاء `POST /api/chat/send` مع `{ orderId, content }` ثم `broadcastMessage(result.message)` عند النجاح.
- **صفحة مراجعة التعديل (مهندس):** إرسال نقطة التعديل إلى المحادثة عبر `/api/chat/send` بدلاً من `/api/messages/:orderId`.

### 4. الـ Middleware

- إضافة `/api/chat/` إلى قائمة مسارات الـ polling (نفس معاملة `/api/messages/` و `/api/notifications`) لتخفيف الحد والتحقق من الجلسة إن لزم.

---

## متطلبات التشغيل

- **Supabase:** ضروري لـ Realtime. تأكد من ضبط `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_ANON_KEY` على Vercel.
- إذا لم يكن Supabase متاحاً، المحادثة تعمل عبر المسارات الجديدة فقط مع الـ polling (كل 20 ثانية) دون تحديث فوري عند إرسال الطرف الآخر.

---

## مسارات المحادثة القديمة

- `/api/messages/[orderId]` (GET/POST) و `/api/messages/send` (POST) ما زالا موجودين في المشروع لكن **واجهة المحادثة لا تستخدمهما** بعد هذه الخطة البديلة.
