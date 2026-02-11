# رفع المشروع على Firebase — شرح بخطوات بسيطة

هذا الملف يشرح بأبسط شكل: كيف ترفع مشروعك وتفعّل تسجيل الدخول (المصادقة) عبر Firebase.

---

## ⚠️ ملاحظة مهمة: استضافة Firebase (App Hosting)

**Firebase App Hosting** (استضافة تطبيق Next.js كامل على Firebase) يتطلب **تفعيل الفوترة** (خطة Blaze) على المشروع. تفعيل الفوترة غير متاح حالياً لحسابات الأفراد في بعض المناطق (مثل السعودية).

**هذا لا يعني أن الفكرة فشلت.** يمكنك:

- **المصادقة (تسجيل الدخول):** تبقى على **Firebase** بالخطة المجانية (Spark) — لا تحتاج تفعيل فوترة.
- **الاستضافة (رفع الموقع):** على **Vercel** (مجاني ويدعم Next.js بدون بطاقة أو فوترة Google).

المشروع مضبوط لهذا السيناريو: مصادقة Firebase + استضافة Vercel. انظر **الخيار ج** أدناه.

---

## ماذا نريد أن نفعل؟

1. **نرفع موقعك على الإنترنت** — إما على Firebase (إن توفرت الفوترة) أو على **Vercel** (الخيار العملي بدون فوترة).
2. **نفعّل تسجيل الدخول بالبريد وكلمة المرور** عبر خدمة Firebase (يعمل على الخطة المجانية).

---

## الجزء الأول: إعداد Firebase من الموقع (مرة واحدة)

### الخطوة 1 — إنشاء مشروع

1. افتح المتصفح وادخل إلى: **https://console.firebase.google.com**
2. اضغط **إنشاء مشروع** (أو **Add project**).
3. اكتب اسم المشروع (مثل: `think-platform`) واضغط **متابعة**.
4. يمكنك إيقاف "Google Analytics" إذا لا تريده، ثم **إنشاء المشروع**.

### الخطوة 2 — تفعيل تسجيل الدخول (البريد وكلمة المرور)

1. من القائمة اليسرى: **Build** ← **Authentication**.
2. اضغط **Get started** (ابدأ).
3. في الأعلى اختر تبويب **Sign-in method**.
4. اضغط على **Email/Password**.
5. فعّل **Enable** (التفعيل) ثم **Save**.

الآن Firebase جاهز لقبول مستخدمين يتسجلون بالبريد وكلمة المرور.

### الخطوة 3 — أخذ الإعدادات (للمشروع لاحقاً)

1. اضغط على أيقونة **الترس** ⚙️ بجانب "Project Overview" ← **Project settings**.
2. انزل إلى **Your apps**.
3. إذا لم يكن هناك تطبيق ويب، اضغط أيقونة **</>** (ويب) واتبع الخطوات وأعطِ اسماً للتطبيق.
4. ستظهر لك قيم مثل:
   - **apiKey**
   - **authDomain**
   - **projectId**

**احتفظ بهذه القيم** — ستحتاجها في الخطوة التالية (متغيرات البيئة).

---

## الجزء الثاني: أين نستضيف موقع Next.js؟

موقعك مبني بـ **Next.js** (صفحات + API). لذلك عندك خياران:

### الخيار أ — استضافة كاملة على Firebase (يتطلب تفعيل الفوترة)

- اسم الخدمة: **Firebase App Hosting**.
- المعنى: Firebase يربط مشروعك من **GitHub** ويبني الموقع ويشغّله عند كل تحديث.
- **شرط:** تفعيل الفوترة (Blaze) على المشروع — غير متاح لحسابات الأفراد في بعض المناطق.

**ما الذي تفعله بشكل مختصر (إن توفرت الفوترة):**

1. ارفع مشروعك على **GitHub** (إذا لم يكن مرفوعاً).
2. في Firebase Console: **Build** ← **App Hosting** ← **Get started**.
3. اختر **ربط مستودع GitHub** واختر المستودع وفرع النشر (مثل `main`).
4. حدد **مجلد الجذر** للمشروع (عادة المجلد الذي فيه `package.json`).
5. أضف **متغيرات البيئة** (انظر القسم التالي).
6. اضغط نشر — وسيظهر لك رابط الموقع (مثل `xxx.apphosting.web.app`).

### الخيار ج — Vercel للاستضافة + Firebase للمصادقة (الأنسب بدون فوترة)

- **الاستضافة:** على **Vercel** (مجاني، يدعم Next.js، لا يحتاج بطاقة أو فوترة Google).
- **المصادقة:** على **Firebase** (الخطة المجانية Spark تكفي لتسجيل الدخول بالبريد وكلمة المرور).

**ما الذي تفعله بشكل مختصر:**

1. ارفع المشروع على **GitHub**.
2. ادخل إلى [vercel.com](https://vercel.com) وسجّل الدخول (أو أنشئ حساباً) واربط GitHub.
3. **New Project** ← اختر المستودع وفرع النشر (مثل `main`).
4. أضف **متغيرات البيئة** في Vercel (انظر الجدول في القسم الثالث)، ومنها:
   - `NEXT_PUBLIC_USE_FIREBASE_AUTH=true`
   - `NEXT_PUBLIC_FIREBASE_API_KEY` و `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` و `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (من Firebase Console).
   - `DATABASE_URL` و `NEXTAUTH_SECRET` و `NEXTAUTH_URL` حسب إعداد مشروعك.
5. اضغط **Deploy** — ستحصل على رابط مثل `https://اسم-المشروع.vercel.app`.
6. في **Firebase Console** → **Authentication** → **Settings** → **Authorized domains** أضف نطاقك (مثل `اسم-المشروع.vercel.app`) حتى يعمل تسجيل الدخول.

هذا الخيار يعمل من السعودية ولا يحتاج تفعيل الفوترة على Google.

### الخيار ب — استضافة ملفات ثابتة فقط

- اسم الخدمة: **Firebase Hosting** (التقليدي).
- المعنى: ترفع فقط **ملفات ثابتة** (HTML, CSS, JS جاهزة). مسارات الـ API (`/api/*`) **لا تعمل** بهذه الطريقة إلا إذا نقلتها إلى Cloud Functions.
- الاستخدام: مناسب لو عندك موقع بسيط أو لو الـ API يعمل من مكان آخر.

**ما الذي تفعله بشكل مختصر:**

1. تثبت أدوات Firebase على جهازك: `npm install -g firebase-tools`
2. من مجلد المشروع: `firebase login` ثم `firebase init` واختر Hosting.
3. تصدّر الموقع كملفات ثابتة (`output: 'export'` في next.config ثم `npm run build`).
4. ترفع المجلد الناتج: `firebase deploy --only hosting`.

---

## الجزء الثالث: متغيرات البيئة (مهمة للمصادقة والاتصال)

حتى يعرف موقعك "أين Firebase" ويستخدم المصادقة، تحتاج إضافة قيم في مكان يقرأها التطبيق. هذه القيم تسمى **متغيرات البيئة**.

### إذا استخدمت Firebase App Hosting (الخيار أ) أو Vercel (الخيار ج)

- **App Hosting:** من واجهة App Hosting في Firebase Console ابحث عن **Environment variables** أو **Configuration**.
- **Vercel:** من المشروع في Vercel ← **Settings** ← **Environment Variables**.
- أضف المتغيرات التالية (استبدل القيم الحقيقية من الخطوة 3 أعلاه):

| اسم المتغير | مثال على القيمة |
|-------------|------------------|
| `NEXT_PUBLIC_USE_FIREBASE_AUTH` | `true` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | القيمة من Firebase (apiKey) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `اسم-مشروعك.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | اسم مشروعك من Firebase |
| `DATABASE_URL` | رابط قاعدة البيانات (إن كان المشروع يستخدمها) |
| `NEXTAUTH_SECRET` | سلسلة عشوائية طويلة (32 حرفاً أو أكثر) |
| `NEXTAUTH_URL` | رابط موقعك بعد النشر (مثل `https://xxx.vercel.app` أو `https://xxx.apphosting.web.app`) |

### إذا شغّلت المشروع محلياً (على جهازك)

- أنشئ ملفاً اسمه `.env` في جذر المشروع (إن لم يكن موجوداً).
- ضع فيه نفس المتغيرات أعلاه، مثلاً:

```env
NEXT_PUBLIC_USE_FIREBASE_AUTH=true
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=اسم-مشروعك.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=اسم-مشروعك
```

(واستبدل القيم الحقيقية من إعدادات المشروع في Firebase.)

---

## ملخص سريع جداً

| الخطوة | ماذا تفعل |
|--------|-----------|
| 1 | إنشاء مشروع في Firebase Console وتفعيل Email/Password في Authentication. |
| 2 | أخذ apiKey و authDomain و projectId من Project settings. |
| 3 | اختيار الاستضافة: **Vercel** (الأنسب بدون فوترة)، أو **App Hosting** (إن توفرت الفوترة)، أو **Hosting** لملفات ثابتة. |
| 4 | إضافة متغيرات البيئة (في Vercel أو App Hosting أو في ملف `.env` محلياً). |
| 5 | النشر: من Vercel أو App Hosting، أو `firebase deploy --only hosting` للثابت. إضافة نطاق الموقع في Firebase → Authorized domains. |

---

## ملاحظة عن كود المصادقة في المشروع

المشروع مضبوط ليدعم مصادقة Firebase عبر المتغير `NEXT_PUBLIC_USE_FIREBASE_AUTH`، ويحتوي على:

- `lib/firebaseClient.ts` — لربط المتصفح بـ Firebase.
- `components/providers/FirebaseAuthProvider.tsx` — لعرض حالة المستخدم (مسجّل دخول أم لا) في الواجهة.

تأكد من إضافة متغيرات Firebase في `.env` (محلياً) أو في Vercel (عند النشر).

---

إذا وضّحت أي خطوة بالذات (مثلاً: "لم أفهم خطوة أخذ الإعدادات" أو "لم أفهم متغيرات البيئة") يمكن شرحها فقط بأبسط شكل.
