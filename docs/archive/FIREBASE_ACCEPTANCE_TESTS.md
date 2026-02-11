# اختبارات القبول لانتقال منصة فكرة إلى Firebase

**المرجع:** FIREBASE_MIGRATION_SCOPE.md و خطة تنفيذ الانتقال إلى Firebase

---

## المرحلة 0: التحليل والتوثيق

- [ ] وجود مستند FIREBASE_MIGRATION_SCOPE.md يحتوي جدول مسارات API وقائمة تدفقات Must-Work لكل دور.
- [ ] وجود مستند FIREBASE_ACCEPTANCE_TESTS.md (هذا الملف) مرتبط بكل مرحلة.
- [ ] فرع Git `firebase-migration` منشأ و main محفوظ كمرجع.

---

## المرحلة 1: البنية التحتية Firebase

- [ ] تفعيل Authentication (Email/Password) من Firebase Console.
- [ ] إنشاء قاعدة Firestore.
- [ ] تفعيل Storage وقواعد أمان أولية.
- [ ] ترقية المشروع لخطة Blaze إن لزم (لـ Cloud Functions).
- [ ] `firebase init` أو تحديث الإعداد (Functions، Firestore، Storage) دون استبدال firebase.json/.firebaserc إن وُجدت.
- [ ] تشغيل `npm run dev`: تسجيل الدخول وإنشاء طلب يعمل كما قبل؛ لا أخطاء جديدة.

---

## المرحلة 2: المصادقة — نقل المستخدمين والأدوار

- [ ] سكربت نقل المستخدمين (scripts/migrate-users-to-firebase-auth.ts أو ما يعادله) يعمل ويُنشئ حسابات في Firebase Auth.
- [ ] مستندات Firestore `users/{uid}` تحتوي name، phone، role، createdAt.
- [ ] طبقة تجريبية (Context أو صفحة) تستدعي Firebase Auth وتقرأ الدور بنجاح.
- [ ] تسجيل الدخول بحساب تم نقله من الواجهة التجريبية؛ ظهور الدور الصحيح (عميل/مهندس/مدير).
- [ ] المنصة الحالية (NextAuth) ما زالت تعمل للواجهة الرئيسية إن لم تُستبدل بعد.

---

## المرحلة 3: قاعدة البيانات — Firestore ونقل البيانات

- [ ] تصميم المجموعات (users، packages، orders، plans، messages، payments، revisionRequests، notifications، engineerApplications) موثّق.
- [ ] قواعد أمان Firestore مكتوبة ومفعّلة.
- [ ] سكربت نقل البيانات ينفّذ بنجاح؛ أعداد السجلات مطابقة للمصدر (أو مُوثّقة إن اختلفت).
- [ ] عينة يدوية: طلبات ورسائل ومخططات في Firestore صحيحة الحقول والمراجع.
- [ ] المنصة الحالية ما زالت تعمل من Prisma (الـ API لم يُستبدل بعد).

---

## المرحلة 4: الملفات — Firebase Storage

- [ ] رفع مخطط جديد من لوحة المهندس يظهر في Firebase Storage.
- [ ] رابط الملف يُحفظ في الطلب/المخطط (Firestore أو Prisma مؤقتاً) ويعمل للعرض.
- [ ] عميل يفتح صفحة الطلب ويرى المخططات.
- [ ] قواعد Storage تسمح بالقراءة/الكتابة للمصادقين حسب الدور.

---

## المرحلة 5: API — Cloud Functions

- [ ] مشروع Functions (functions/) موجود ويستخدم firebase-admin (Firestore، Storage، Auth).
- [ ] دالة مساعدة للتحقق من ID Token و uid/role موجودة.
- [ ] مجموعة Auth: register (إنشاء مستخدم Auth + مستند users) — اختبار من Postman/سكربت مع ID Token.
- [ ] مجموعة Orders: create، my-orders، [id]، buy-extension، buy-revisions، complete، package، plans — كلها تعيد نفس شكل الاستجابة والرموز.
- [ ] مجموعة Messages، Plans، Revisions، Payments، Admin، Engineer، Users، Notifications، WhatsApp — نفس المعيار.
- [ ] Rate limiting أو App Check مُطبّق إن وُجد في الخطة.

---

## المرحلة 6: الواجهة — ربط Auth و API

- [ ] Firebase JS SDK مُهيّأ في العميل (Auth).
- [ ] استبدال NextAuth بـ Firebase Auth (تسجيل دخول، تسجيل، خروج، onAuthStateChanged).
- [ ] Context أو حالة تحمل المستخدم والدور (من Firestore أو Custom Claims).
- [ ] lib/api.ts أو بديله يستدعي Cloud Functions مع Authorization: Bearer <idToken>.
- [ ] Middleware محدّث لحماية المسارات حسب Firebase Auth (أو التحقق من جانب العميل).
- [ ] قائمة التحقق الكاملة: تسجيل دخول (عميل، مهندس، مدير)، إنشاء طلب، دفع، محادثة، رفع مخطط، إدارة باقات وطلبات من لوحة الإدارة — كلها تعمل دون أخطاء في الـ Console.

---

## المرحلة 7: النشر والاختبار النهائي

- [ ] متغيرات البيئة للـ Functions مضبوطة.
- [ ] `firebase deploy --only functions` ينجح (predeploy في firebase.json يشغّل بناء TypeScript للـ functions).
- [ ] نشر الواجهة (Hosting أو App Hosting) ينجح — راجع FIREBASE_PHASE7_README.md.
- [ ] Authorized domains و CORS مضبوطان إن لزم.
- [ ] تنفيذ كل اختبارات القبول أعلاه على الـ URL المنشور (الإنتاج).
- [ ] مراجعة لوحة Firebase: لا أخطاء غير متوقعة في Functions أو Firestore أو Storage.

**المرجع الكامل للمرحلة 7:** FIREBASE_PHASE7_README.md
