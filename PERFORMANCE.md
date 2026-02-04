# ملخص الأداء والتحميل — منصة فكرة

توثيق إعدادات الأداء والتحميل المطبقة في المشروع.

---

## 1. المصادقة (Auth)

- **Timeout إجمالي:** 6 ثوانٍ في `FirebaseAuthProvider` — إذا لم تنتهِ حالة Auth خلال 6 ثوانٍ تُرفع شاشة "جاري التحميل" لتجنب الشاشة المعلقة.
- **Timeout قراءة الدور والملف:** 4 ثوانٍ — استدعاء `getUserRoleAndProfile` (قراءة Firestore واحدة للمستخدم) مع `Promise.race` و timeout يعيد دور افتراضي `CLIENT`.
- **قراءة Firestore:** قراءة واحدة لمستند `users/{uid}` لاستخراج `role` و `name` و `email` (بدلاً من قراءتين منفصلتين سابقاً). يُحاول أولاً الحصول على الدور من Custom Claims إن وُجدت.

---

## 2. تحميل الصفحة (Route-level loading)

- **`loading.tsx`** موجود في المسارات التالية لعرض دوّار تحميل أثناء جلب الصفحة:
  - `app/(client)/dashboard/loading.tsx`
  - `app/(client)/orders/[id]/loading.tsx`
  - `app/(client)/orders/create/loading.tsx`
  - `app/admin/dashboard/loading.tsx`

---

## 3. الاستيراد الديناميكي (dynamic)

- **صفحة إنشاء الطلب:** المكوّن الرئيسي `CreateOrderContent` مُحمّل ديناميكياً عبر `next/dynamic` في `app/(client)/orders/create/page.tsx` مع `ssr: false` و fallback تحميل، لتقليل حجم الحزمة الأولى لهذا المسار.
- **الهيدر:** مكوّن `NotificationBell` مُحمّل ديناميكياً في `components/layout/Header.tsx`.

---

## 4. واجهات API والتخزين المؤقت

- **`GET /api/packages`:** استخدام `unstable_cache` (revalidate 60 ثانية) مع رأس `Cache-Control: public, s-maxage=60, stale-while-revalidate=60`.
- **`GET /api/content/homepage`:** استخدام `unstable_cache` (revalidate 60 ثانية) مع رأس `Cache-Control` نفسه.

---

## 5. قياس الأداء (يدوي)

- تشغيل **Lighthouse** (Chrome DevTools) على الصفحة الرئيسية، `/login`، `/dashboard`، `/orders/create` لتسجيل LCP و FID/INP و CLS.
- فحص **Network** لوقت استجابة `/api/packages` و `/api/orders/my-orders` و `/api/content/homepage`.

---

## 6. تشخيص تحميل Auth (اختياري)

لتفعيل تسجيلات تشخيصية مؤقتة عند استكشاف بطء "جاري التحميل":

- ضبط متغير البيئة **`NEXT_PUBLIC_DEBUG_AUTH_LOADING=1`** (تمت إزالة الاستدعاءات من الكود؛ يمكن إعادة إضافتها عند الحاجة كما في [LOADING_SLOWNESS_PLAN.md](./LOADING_SLOWNESS_PLAN.md)).

---

**المراجع:** [LOADING_SLOWNESS_PLAN.md](./LOADING_SLOWNESS_PLAN.md) | [TESTING_PLAN.md](./TESTING_PLAN.md)
