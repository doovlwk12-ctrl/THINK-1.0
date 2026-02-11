# المرحلة 4: رفع المخططات إلى Firebase Storage

## التفعيل

- تعيين `GOOGLE_APPLICATION_CREDENTIALS` (مسار مفتاح Service Account)، أو
- تعيين `FIREBASE_STORAGE_ENABLED=true` مع نفس المفتاح.

عند التفعيل، مسار رفع المخططات ([app/api/plans/upload](app/api/plans/upload/route.ts)) يستخدم [lib/storage.ts](lib/storage.ts) الذي يحاول أولاً [lib/firebaseStorage.ts](lib/firebaseStorage.ts). الملف يُرفع إلى Firebase Storage في المسار `plans/{uuid}.{ext}` ويُعاد رابط موقع (Signed URL) صالح لمدة 30 يوماً يُحفظ في حقل `fileUrl` في Plan (Prisma كما هو).

## السقوط (Fallback)

إذا فشل الرفع إلى Firebase (مثلاً عدم تعيين المفتاح في وقت التشغيل)، يتم الرجوع إلى التخزين المحلي (أو S3/Cloudinary إن وُجدت متغيراتها).

## التحقق

- رفع مخطط جديد من لوحة المهندس مع تفعيل Firebase Storage؛ التحقق من ظهور الملف في Firebase Console → Storage.
- فتح صفحة الطلب كعميل ورؤية المخطط (الرابط المُعاد يعمل للعرض حتى انتهاء صلاحية الـ Signed URL).
