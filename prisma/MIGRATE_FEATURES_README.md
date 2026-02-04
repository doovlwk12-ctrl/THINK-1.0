# تطبيق هجرة featuresJson يدوياً

لماذا `prisma migrate dev` يعطي P3006؟
- مجلد الهجرات لا يحتوي على الهجرة التي أنشأت الجداول الأساسية (مثل `Package`).
- قاعدة الظل تُبنى بإعادة تشغيل الهجرات فقط، فلا يُنشأ جدول `Package`، فيفشل تطبيق هجرة إضافة العمود.

**لا تستخدم `prisma migrate dev` لهذه الهجرة.** استخدم الخطوات التالية:

## الخطوات (بالترتيب)

1. توليد عميل Prisma:
   ```bash
   npx prisma generate
   ```

2. إضافة العمود يدوياً:
   ```bash
   node scripts/apply-features-migration.js
   ```
   أو: `npm run db:migrate-apply-features`

3. تسجيل الهجرة كمطبقة:
   ```bash
   npx prisma migrate resolve --applied 20250201000000_add_package_features_json
   ```
   أو: `npm run db:migrate-resolve-features`

بعد ذلك تكون قاعدة البيانات محدثة ويمكنك استخدام المميزات من لوحة التحكم.
