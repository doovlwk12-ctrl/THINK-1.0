# تصميم Firestore لمنصة فكرة (المرحلة 3)

## المجموعات والحقول

- **users** (تم ملؤها في المرحلة 2): `{ name, phone, role, createdAt, updatedAt, legacyId, email }`. معرّف المستند = Firebase Auth uid.

- **packages**: معرّف المستند = Prisma id. الحقول: `nameAr`, `nameEn`, `price`, `revisions`, `executionDays`, `isActive`, `createdAt`, `updatedAt` (Timestamp).

- **orders**: معرّف المستند = Prisma id. الحقول: `orderNumber`, `clientId` (Firebase uid), `engineerId` (Firebase uid أو null), `packageId`, `status`, `formData`, `remainingRevisions`, `deadline`, `completedAt`, `createdAt`, `updatedAt` (كل التواريخ Timestamp).

- **plans**: معرّف المستند = Prisma id. الحقول: `orderId`, `fileUrl`, `fileType`, `fileName`, `fileSize`, `isActive`, `createdAt` (Timestamp).

- **messages**: معرّف المستند = Prisma id. الحقول: `orderId`, `senderId` (Firebase uid), `content`, `isRead`, `createdAt` (Timestamp).

- **payments**: معرّف المستند = Prisma id. الحقول: `orderId`, `amount`, `method`, `status`, `transactionId`, `createdAt`, `updatedAt` (Timestamp).

- **revisionRequests**: معرّف المستند = Prisma id. الحقول: `orderId`, `planId`, `pins`, `status`, `createdAt`, `updatedAt` (Timestamp).

- **notifications**: معرّف المستند = Prisma id. الحقول: `userId` (Firebase uid), `type`, `title`, `message`, `data`, `isRead`, `createdAt` (Timestamp).

- **engineerApplications**: معرّف المستند = Prisma id. الحقول: `token`, `name`, `email`, `phone`, `password`, `status`, `adminId` (Firebase uid أو null), `adminNotes`, `createdAt`, `updatedAt`, `reviewedAt` (Timestamp أو null).

## ربط المعرّفات

- `clientId` و `engineerId` في orders: قيمتهما بعد النقل = Firebase Auth uid (من مجموعة users، حقل legacyId = المعرّف القديم في Prisma).
- `senderId` في messages: نفس الربط (uid).
- `userId` في notifications: نفس الربط (uid).
- `adminId` في engineerApplications: نفس الربط (uid) إن وُجد.
- `orderId`, `packageId`, `planId` إلخ تبقى كمعرّفات مستندات Firestore (نفس قيمة Prisma id) لعدم تغيير المراجع بين الطلبات والمخططات والرسائل.

## قواعد الأمان

- القواعد الحالية في `firestore.rules`: قراءة/كتابة للمصادقين فقط. يمكن لاحقاً تحديد قواعد أدق لكل مجموعة حسب الدور (عميل، مهندس، إدارة).
