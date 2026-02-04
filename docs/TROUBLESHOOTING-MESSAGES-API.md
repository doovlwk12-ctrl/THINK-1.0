# حل أخطاء 500 و 405 لـ /api/messages/[orderId]

## الأعراض
- **500 Internal Server Error** عند فتح صفحة المحادثة أو جلب الرسائل.
- **405 Method Not Allowed** أحياناً لنفس الرابط.

## الأسباب الشائعة على Vercel

### 1. متغيرات البيئة ناقصة (الأكثر احتمالاً)
إذا كان المصادقة عبر **Supabase**، تأكد في **Vercel → Project → Settings → Environment Variables** من وجود:

| المتغير | مطلوب |
|---------|--------|
| `NEXT_PUBLIC_USE_SUPABASE_AUTH` | `true` |
| `NEXT_PUBLIC_SUPABASE_URL` | من Supabase → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | من Supabase → API |
| `DATABASE_URL` | رابط **Pooler** (منفذ 6543) مع `?pgbouncer=true` |

إذا نَقص أحدها قد يحدث 500. بعد التعديل: **Redeploy**.

### 2. قاعدة البيانات (503/500)
- استخدم **Connection string** من نوع **Transaction (Pooler)** وليس Direct.
- أضف في نهاية الرابط: `?pgbouncer=true`.
- راجع [DEPLOYMENT.md - إصلاح خطأ 503](DEPLOYMENT.md).

### 3. الجلسة (Session)
- 500 قد يحدث إن لم تُرسل **cookies** الجلسة مع الطلب (مثلاً من نطاق مختلف).
- تأكد أن الموقع يُفتح على نطاق النشر نفسه (مثل `https://think-1-0-xxx.vercel.app`) وليس من localhost عند الاختبار.

### 4. معرف الطلب (orderId)
- الرابط يجب أن يكون: `/api/messages/{orderId}` حيث `orderId` هو معرف الطلب الحقيقي.
- إذا كان الرابط خاطئاً أو الـ order غير موجود قد تحصل على 400 أو 404 وليس 500.

## التحقق من السجلات (Logs)
من **Vercel → Project → Deployments → اختر النشر → Functions** أو **Logs**، ابحث عن الطلبات إلى `/api/messages/...` واقرأ رسالة الخطأ الفعلية (مثلاً Prisma، أو Missing env، أو timeout).

## ما تم تحسينه في الكود
- دعم **OPTIONS** لمسار الرسائل لتقليل 405 إن كان المتصفح يرسل طلب استطلاع.
- معالجة **params** بشكل آمن في المسار الديناميكي.
- عدم رمي استثناء عند غياب متغيرات Supabase؛ يُعاد 401 بدلاً من 500.
