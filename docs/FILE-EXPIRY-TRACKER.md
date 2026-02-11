# تتبع انتهاء صلاحية الملفات (file_expiry_tracker)

عند رفع ملفات المهندس (PDF, PNG, JPG) إلى Supabase Storage (bucket **orders**)، يُسجَّل لكل ملف سجل في جدول **file_expiry_tracker** يتضمن مسار الملف وتاريخ انتهاء الصلاحية.

---

## الجدول

| العمود      | الوصف |
|------------|--------|
| `id`       | معرّف فريد (cuid) |
| `filePath` | مسار الملف داخل الـ bucket (مثل `plans/abc123.pdf`) |
| `expiryDate` | تاريخ انتهاء الصلاحية (يُستخدم لحذف الملف أو مراجعته لاحقاً) |
| `isDeleted` | `false` عند الإنشاء؛ يُحدَّث إلى `true` بعد حذف الملف أو تعطيل التتبع |
| `createdAt` | وقت إنشاء السجل |

---

## كيف يُحسب تاريخ الانتهاء (expiry_date) برمجياً

التاريخ المطلوب: **الآن + 30 يوماً**.

1. **الطابع الزمني الحالي بالميلي ثانية:**  
   `Date.now()` يعطي عدد الميلي ثانية منذ 1 يناير 1970 (UTC).

2. **تحويل 30 يوماً إلى ميلي ثانية:**  
   - يوم واحد = 24 ساعة × 60 دقيقة × 60 ثانية × 1000 ميلي ثانية  
   - إذن: `30 * 24 * 60 * 60 * 1000`

3. **تاريخ الانتهاء:**  
   `new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)`  
   يعطي نفس اليوم والساعة بعد 30 يوماً من الآن.

**مثال:** إذا كان الرفع يوم 11 فبراير 2025 الساعة 10:00 ص، فإن `expiry_date` = 13 مارس 2025 الساعة 10:00 ص.

الدالة المستخدمة في الكود: **`computeExpiryDate(daysFromNow)`** في `lib/uploadEngineerFile.ts` (الافتراضي 30 يوماً).

---

## دالة الرفع

- **الملف:** `lib/uploadEngineerFile.ts`
- **الدالة:** `uploadEngineerFileToOrders(file, options?)`
  - ترفع الملف إلى bucket **orders** (مسار فرعي مثل `plans/`).
  - بعد نجاح الرفع تُدخل سجلاً في **file_expiry_tracker** يحتوي على `file_path` و `expiry_date` (الآن + 30 يوماً) و `is_deleted = false`.
- **الاستخدام:** يُستدعى تلقائياً من `POST /api/plans/upload` عندما يكون Supabase Storage مُعداً (`SUPABASE_SERVICE_ROLE_KEY` و `NEXT_PUBLIC_SUPABASE_URL`).

---

## تطبيق الجدول على قاعدة البيانات

بعد تعديل الـ schema شغّل أحد الأمرين:

```bash
npx prisma db push
# أو
npx prisma migrate dev --name add_file_expiry_tracker
```
