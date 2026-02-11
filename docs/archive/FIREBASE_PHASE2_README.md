# المرحلة 2: نقل المستخدمين والأدوار إلى Firebase

## تشغيل سكربت النقل

1. **الحصول على مفتاح Service Account**
   - Firebase Console → Project settings → Service accounts → Generate new private key.
   - احفظ الملف (مثلاً `serviceAccountKey.json`) خارج المستودع (لا ترفعه إلى Git).

2. **تعيين المتغيرات**
   - `GOOGLE_APPLICATION_CREDENTIALS`: المسار الكامل لملف المفتاح (مثلاً `C:\path\to\serviceAccountKey.json`).
   - اختياري: `TEMP_PASSWORD` — كلمة مرور مؤقتة للمستخدمين المنقولين (افتراضي: `TempPass123!`).
   - اختياري: `GCLOUD_PROJECT` أو `FIREBASE_PROJECT_ID` — معرّف المشروع (افتراضي: `think-9a834`).

3. **التشغيل**
   ```bash
   npm run firebase:migrate-users
   ```

4. **النتيجة**
   - إنشاء مستخدمين في Firebase Authentication (بريد/كلمة مرور).
   - إنشاء مستندات في Firestore تحت `users/{uid}` تحتوي: name, phone, role, createdAt, updatedAt, legacyId, email.
   - تعيين Custom Claims: `role` (CLIENT | ENGINEER | ADMIN).
   - `legacyId` = معرّف المستخدم القديم في Prisma (لاستخدامه في المرحلة 3 لربط الطلبات والرسائل).

## التحقق من النقل

- **Firebase Console → Authentication:** ظهور المستخدمين بنفس البريد.
- **Firebase Console → Firestore → users:** كل مستند يحتوي name, phone, role, legacyId.
- **اختبار تسجيل الدخول:** سيتم في المرحلة 6 عند ربط الواجهة بـ Firebase Auth (صفحة تجريبية أو استبدال NextAuth).

## التحقق من الهوية في الـ API (للمرحلة 5)

في Cloud Functions، التحقق من طلبات الواجهة:

1. استخراج الهيدر: `Authorization: Bearer <idToken>`.
2. التحقق: `const decoded = await admin.auth().verifyIdToken(idToken); const uid = decoded.uid;`
3. قراءة الدور: من Custom Claims `decoded.role` أو من Firestore `users/{uid}.role`.

لا تعديل على `lib/auth.ts` أو NextAuth في هذه المرحلة؛ المنصة ما زالت تستخدم NextAuth حتى المرحلة 6.
