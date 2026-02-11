# المرحلة 5: Cloud Functions للـ API

## الهيكل الحالي

- **functions/src/index.ts**: تهيئة Firebase Admin وتصدير الدوال (placeholder، apiRegister).
- **functions/src/helpers/auth.ts**: مساعد التحقق من الهوية (getAuthFromRequest، requireAuth) لاستخدامه في الدوال المحمية.
- **functions/src/register.ts**: دالة `apiRegister` — تسجيل مستخدم جديد (Firebase Auth + Firestore users + Custom Claims). تطابق عقد [app/api/auth/register](app/api/auth/register/route.ts).

## نشر الدوال

```bash
cd functions
npm run build
firebase deploy --only functions
```

بعد النشر، عنوان دالة التسجيل يكون على شكل:
`https://us-central1-<project-id>.cloudfunctions.net/apiRegister`

## إضافة مسارات API لاحقاً

1. إنشاء ملف جديد في `functions/src/` (مثلاً `ordersCreate.ts`).
2. استيراد `requireAuth` من `helpers/auth` والتحقق من الهوية.
3. قراءة/كتابة Firestore بدلاً من Prisma؛ استخدام `admin.firestore()`.
4. تصدير الدالة من `index.ts` وإضافتها إلى النشر.

## اختبار apiRegister

- POST إلى رابط الدالة مع body: `{ "name", "email", "phone", "password" }`.
- التحقق من إنشاء المستخدم في Firebase Auth ومستند في Firestore `users/{uid}` مع role CLIENT.
