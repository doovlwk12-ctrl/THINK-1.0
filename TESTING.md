# دليل الاختبارات

## تشغيل الاختبارات

| الأمر | الوصف |
|--------|--------|
| `npm run test` | تشغيل Vitest في وضع المراقبة (watch) |
| `npm run test:run` | تشغيل Vitest مرة واحدة (مناسب لـ CI) |
| `npm run test:e2e` | تشغيل اختبارات Playwright E2E (يُشغّل `npm run dev` تلقائياً إن لزم) |

## ما الذي تُغطيه الاختبارات؟

### اختبارات الوحدة (Vitest)

- **lib/utils.test.ts**: دوال التنسيق والتحقق من [lib/utils.ts](lib/utils.ts)
  - `formatCurrency`، `validatePhoneNumber`، `validateEmail`، `isOrderExpired`، `generateOrderNumber`
- **lib/sanitize.test.ts**: دوال التعقيم من [lib/sanitize.ts](lib/sanitize.ts)
  - `sanitizeText`، `sanitizeHtml`، `sanitizeForDisplay`

### اختبارات E2E (Playwright)

- **e2e/homepage.spec.ts**: الصفحة الرئيسية
  - تحميل الصفحة وظهور قسم "باقات الخدمة"
  - ظهور المحتوى أو حالة التحميل في قسم الباقات

## قائمة تحقق قبول يدوي (اختياري)

قبل إصدار نسخة يمكن التحقق من:

- [ ] تسجيل الدخول (بريد وكلمة مرور)
- [ ] إنشاء حساب جديد
- [ ] الصفحة الرئيسية تعرض الباقات دون خطأ في الكونسول
- [ ] إنشاء طلب جديد (اختيار باقة، إدخال البيانات، إرسال)
- [ ] لوحة تحكم العميل تعرض الطلبات
- [ ] لوحة تحكم المهندس (إن وُجدت) تعرض الطلبات المعينة
