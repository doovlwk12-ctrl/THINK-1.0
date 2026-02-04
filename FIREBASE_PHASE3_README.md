# المرحلة 3: نقل البيانات إلى Firestore

## المتطلبات

- إكمال المرحلة 2 (نقل المستخدمين إلى Firebase Auth ومجموعة `users` في Firestore مع حقل `legacyId`).
- تعيين `GOOGLE_APPLICATION_CREDENTIALS` (ومعرف المشروع إن لزم).

## التشغيل

```bash
npm run firebase:migrate-data
```

## النتيجة

- إنشاء/ملء المجموعات: `packages`, `orders`, `plans`, `messages`, `payments`, `revisionRequests`, `notifications`, `engineerApplications`.
- تحويل المعرّفات: `clientId` و `engineerId` في الطلبات، و`senderId` في الرسائل، و`userId` في الإشعارات، و`adminId` في طلبات الانضمام تصبح Firebase uid (باستخدام mapping من مجموعة `users` وحقل `legacyId`).
- بقية المعرّفات (مثل `orderId`, `packageId`) تبقى كما هي (معرّف مستند Firestore = معرّف Prisma).

## التحقق

- مقارنة عدد السجلات في Prisma مع Firestore لكل مجموعة.
- فتح عينة طلبات ورسائل في Firestore والتحقق من صحة الحقول والمراجع.

لا يتم استبدال Prisma في الـ API في هذه المرحلة؛ الـ API يبقى يعمل من قاعدة البيانات الحالية حتى اكتمال المرحلة 5.
