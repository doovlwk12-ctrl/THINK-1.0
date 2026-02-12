# مسار ملفات وصور المخططات في المنصة

ملخص دورة حياة الملفات: الرفع → التخزين → العرض → الإرسال → التعديلات → التحميل → الأرشفة والحذف.

---

## 1. الرفع (Upload)

- **API:** `POST /api/plans/upload` — [app/api/plans/upload/route.ts](../app/api/plans/upload/route.ts)
- **Supabase:** [lib/uploadEngineerFile.ts](../lib/uploadEngineerFile.ts) + [lib/supabase.ts](../lib/supabase.ts)  
  رفع إلى bucket `orders` بمسار `plans/{orderId}/{uuid}.ext`، وتسجيل في `file_expiry_tracker`.
- **محلي:** [lib/storage.ts](../lib/storage.ts) — عند عدم استخدام Supabase: `public/uploads/plans/{orderId}/`.
- **النتيجة:** جدول `Plan` — `fileUrl`، `fileType` (image/pdf)، `fileName`، `isActive: false`.

---

## 2. العرض (Display)

- **المكوّن:** [components/shared/PlanImage.tsx](../components/shared/PlanImage.tsx)  
  عند وجود `orderId` و `planId` يستخدم المسار الموحّد (مفضّل).
- **مسار الصورة الموحّد:** `GET /api/orders/[id]/plans/[planId]/image` — [app/api/orders/[id]/plans/[planId]/image/route.ts](../app/api/orders/[id]/plans/[planId]/image/route.ts)  
  يتحقق من الصلاحية، يخدم من محلي أو Supabase (admin.download) أو fetch، ويدعم فك ضغط `.gz`.

**أماكن استخدام PlanImage (مع orderId و planId):**  
صفحة تفاصيل الطلب (عميل)، لوحة المهندس، المحادثة، صفحة التعديل (عميل/مهندس).

---

## 3. الإرسال للعميل (Send)

- **API:** `POST /api/plans/send` — [app/api/plans/send/route.ts](../app/api/plans/send/route.ts)  
  يضع `Plan.isActive = true` للمخططات المختارة.
- **عرض للعميل:** [app/api/orders/[id]/route.ts](../app/api/orders/[id]/route.ts) و [app/api/orders/[id]/plans/route.ts](../app/api/orders/[id]/plans/route.ts)  
  يُعاد فقط المخططات النشطة؛ إن وُجد `purgedAt` أو عدم `fileUrl` يُعاد `fileUrl: null`.

---

## 4. التعديل (Revisions)

التعديلات تتم على مستوى طلب تعديل ودبابيس على المخطط. المخطط يُعرض عبر نفس `PlanImage` مع `orderId` و `planId`، والتحميل عبر المسار الموحّد أدناه.

---

## 5. التحميل (Download)

- **API:** `GET /api/orders/[id]/plans/[planId]/download` — [app/api/orders/[id]/plans/[planId]/download/route.ts](../app/api/orders/[id]/plans/[planId]/download/route.ts)
- **المنطق:** مسار محلي → قراءة من `public`. رابط Supabase → تحميل عبر Admin مع فك `.gz` إن لزم. غير ذلك → fetch ثم إرجاع الجسم أو redirect.

---

## 6. الأرشفة والحذف النهائي

- **Cron:** [app/api/cron/purge-archived-plans/route.ts](../app/api/cron/purge-archived-plans/route.ts)
- **تحذير:** قبل 7 أيام من النقل — إشعار للعميل.
- **نقل + ضغط:** بعد المدة من الموعد النهائي — نقل من `plans/` إلى `archive/` مع gzip، تحديث `Plan.fileUrl` إلى `.gz`.
- **حذف نهائي:** بعد مدة الاحتفاظ — حذف من `archive/` ومسح `fileUrl`.

---

## 7. حذف مخطط من الواجهة

- **API:** `DELETE /api/plans/[planId]` — [app/api/plans/[planId]/route.ts](../app/api/plans/[planId]/route.ts)  
  للمخططات غير النشطة؛ حذف الملف من التخزين (محلي أو Supabase) ثم حذف سجل `Plan`.

---

## متغيرات البيئة

لضمان ظهور الصور والتحميل مع Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
