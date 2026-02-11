# المرحلة 1: البنية التحتية Firebase — قائمة التحقق

**الهدف:** إعداد مشروع Firebase وخدماته وهيكل المجلدات دون تغيير أي كود يعمل حالياً.

---

## خطوات Firebase Console (يدوية)

1. **Authentication**
   - افتح [Firebase Console](https://console.firebase.google.com) ومشروعك (مثلاً `think-9a834`).
   - من القائمة: Build → Authentication → Get started.
   - في تبويب Sign-in method: فعّل **Email/Password** (أول خيار).

2. **Firestore Database**
   - Build → Firestore Database → Create database.
   - اختر وضع **Production** أو **Test** حسب السياسة (Test يسمح قراءة/كتابة لفترة محددة).
   - اختر منطقة (region) مناسبة.

3. **Storage**
   - Build → Storage → Get started.
   - اختر وضع الأمان (Production/Test) ثم Done.
   - قواعد الأمان الأولية موجودة في ملف `storage.rules` في المشروع.

4. **Cloud Functions (يتطلب Blaze)**
   - إذا لم يكن المشروع على خطة Blaze: Upgrade project → Blaze (يمكن تحديد ميزانية شهرية).
   - لا حاجة لإنشاء دالة الآن؛ هيكل المجلد `functions/` جاهز للنشر لاحقاً.

---

## التحقق المحلي (بعد الخطوات أعلاه)

- [ ] `npm run dev` يعمل بدون أخطاء.
- [ ] تسجيل الدخول من الواجهة يعمل (NextAuth كما هو).
- [ ] إنشاء طلب يعمل.
- [ ] لم يتم تعديل `app/` أو `lib/auth.ts` أو `prisma/` في هذه المرحلة.

---

## ملفات الإعداد المضافة في المشروع

- `firebase.json`: إضافة أقسام firestore، storage، functions (مع الحفاظ على hosting).
- `firestore.rules`: قواعد أمان أولية لـ Firestore.
- `storage.rules`: قواعد أمان أولية لـ Storage.
- `functions/`: هيكل مشروع Cloud Functions (TypeScript) جاهز للمرحلة 5.
