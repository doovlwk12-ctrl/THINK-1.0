-- تشغيل هذا الملف في Supabase (SQL Editor) مرة واحدة فقط.
-- يزيل القيد الذي يربط جدول الطلبات بـ auth.users حتى يعمل Prisma db push بدون خطأ P4002.
-- بعد التشغيل شغّل: npx prisma db push

-- إزالة القيد إن وُجد (اسم الجدول في Prisma الافتراضي: "Order" بحرف O كبير)
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS client_orders_client_id_fkey;
