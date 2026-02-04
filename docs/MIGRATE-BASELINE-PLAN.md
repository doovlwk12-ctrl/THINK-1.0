# خطة حل خطأ P3005 — قاعدة البيانات غير فارغة (Baseline)

## سبب الخطأ

عند تشغيل `npx prisma migrate deploy` تظهر:

```
Error: P3005
The database schema is not empty.
```

**المعنى:** قاعدة البيانات على Supabase تحتوي بالفعل على جداول (ربما أنشئت بـ `db push` أو هجرات قديمة)، لكن Prisma لا يجد جدول `_prisma_migrations` أو لا يجد سجلات توضح أي الهجرات مُطبَّقة. لذلك يرفض تشغيل الهجرات خوفاً من تكرار تنفيذها أو تعارض مع الوضع الحالي.

---

## الهدف

**أساس (Baseline):** نُعلِم Prisma أن جزءاً من الهجرات (أو كلها) مُطبَّق مسبقاً على القاعدة، ثم نتركه يطبق الهجرات الجديدة فقط.

---

## الهجرات الموجودة (بالترتيب)

| # | اسم المجلد (المستخدم في الأوامر) |
|---|----------------------------------|
| 1 | `20250128000000_add_indexes_and_prepare_for_production` |
| 2 | `20250129000000_add_pin_pack_tables` |
| 3 | `20250130000000_add_homepage_content` |
| 4 | `20250131000000_allow_multiple_payments_per_order` |
| 5 | `20250201000000_add_package_features_json` |
| 6 | `20250202000000_add_revisions_purchase_config` |
| 7 | `20250203000000_add_archive_purge_fields` |
| 8 | `20250204000000_add_order_package_snapshot` |
| 9 | `20250205000000_add_order_audit_log` |
| 10 | `20250206000000_add_payment_idempotency` |

---

## السيناريو أ: القاعدة قديمة (لا تحتوي الجداول الجديدة)

إذا كانت القاعدة من زمن سابق ولا تحتوي مثلاً على جدولَي `OrderAuditLog` و`PaymentIdempotency`:

### الخطوة 1 — تحديد آخر هجرة مُطبَّقة فعلياً

افتح Supabase → **Table Editor** (أو SQL Editor) وتحقق من وجود الجداول:

- إن وُجد جدول **OrderAuditLog** و**PaymentIdempotency** فالقاعدة محدثة تقريباً → انتقل إلى **السيناريو ب**.
- إن لم يوجدا فاعتبر أن آخر هجرة مُطبَّقة هي قبلها (مثلاً حتى `20250204000000_add_order_package_snapshot`).

### الخطوة 2 — اعتبار الهجرات حتى ذلك التاريخ مُطبَّقة (Baseline)

من مجلد المشروع (مع `DATABASE_URL` في `.env` يشير إلى Supabase):

```bash
npx prisma migrate resolve --applied "20250128000000_add_indexes_and_prepare_for_production"
npx prisma migrate resolve --applied "20250129000000_add_pin_pack_tables"
npx prisma migrate resolve --applied "20250130000000_add_homepage_content"
npx prisma migrate resolve --applied "20250131000000_allow_multiple_payments_per_order"
npx prisma migrate resolve --applied "20250201000000_add_package_features_json"
npx prisma migrate resolve --applied "20250202000000_add_revisions_purchase_config"
npx prisma migrate resolve --applied "20250203000000_add_archive_purge_fields"
npx prisma migrate resolve --applied "20250204000000_add_order_package_snapshot"
```

(لا تضف هنا هجرتي `order_audit_log` و`payment_idempotency` إن لم تكونا مُطبَّقتين بعد.)

### الخطوة 3 — تطبيق الهجرات المتبقية

```bash
npx prisma migrate deploy
```

سيقوم Prisma بتشغيل هجرتي `20250205000000_add_order_audit_log` و`20250206000000_add_payment_idempotency` فقط.

---

## السيناريو ب: القاعدة محدثة (كل الجداول موجودة)

إذا كانت القاعدة تحتوي بالفعل على كل الجداول الحالية (بما فيها `OrderAuditLog` و`PaymentIdempotency`)، مثلاً بعد استخدام `db push` سابقاً:

### الخطوة 1 — اعتبار كل الهجرات مُطبَّقة (Baseline كامل)

شغّل مرة واحدة لكل هجرة (بنفس الترتيب):

```bash
npx prisma migrate resolve --applied "20250128000000_add_indexes_and_prepare_for_production"
npx prisma migrate resolve --applied "20250129000000_add_pin_pack_tables"
npx prisma migrate resolve --applied "20250130000000_add_homepage_content"
npx prisma migrate resolve --applied "20250131000000_allow_multiple_payments_per_order"
npx prisma migrate resolve --applied "20250201000000_add_package_features_json"
npx prisma migrate resolve --applied "20250202000000_add_revisions_purchase_config"
npx prisma migrate resolve --applied "20250203000000_add_archive_purge_fields"
npx prisma migrate resolve --applied "20250204000000_add_order_package_snapshot"
npx prisma migrate resolve --applied "20250205000000_add_order_audit_log"
npx prisma migrate resolve --applied "20250206000000_add_payment_idempotency"
```

### الخطوة 2 — التحقق

```bash
npx prisma migrate deploy
```

المفترض أن يرد: لا توجد هجرات جديدة (Everything up to date أو ما شابه).

---

## السيناريو ج: عدم التأكد من محتوى القاعدة

1. ادخل **Supabase → Table Editor** وتحقق من الجداول (User, Order, Package, OrderAuditLog, PaymentIdempotency, …).
2. إن وجدت **OrderAuditLog** و**PaymentIdempotency** → استخدم **السيناريو ب**.
3. إن لم توجد → استخدم **السيناريو أ** (اعتبر أن آخر هجرة مُطبَّقة هي قبل هاتين، ثم نفّذ `resolve --applied` حتى ذلك التاريخ ثم `migrate deploy`).

---

## ملخص الأوامر (نسخ سريع)

**لو القاعدة قديمة (لا تحتوي OrderAuditLog و PaymentIdempotency):**

```bash
npx prisma migrate resolve --applied "20250128000000_add_indexes_and_prepare_for_production"
npx prisma migrate resolve --applied "20250129000000_add_pin_pack_tables"
npx prisma migrate resolve --applied "20250130000000_add_homepage_content"
npx prisma migrate resolve --applied "20250131000000_allow_multiple_payments_per_order"
npx prisma migrate resolve --applied "20250201000000_add_package_features_json"
npx prisma migrate resolve --applied "20250202000000_add_revisions_purchase_config"
npx prisma migrate resolve --applied "20250203000000_add_archive_purge_fields"
npx prisma migrate resolve --applied "20250204000000_add_order_package_snapshot"
npx prisma migrate deploy
```

**لو القاعدة محدثة (كل الجداول موجودة):**

شغّل العشر أوامر `resolve --applied` أعلاه **بالإضافة إلى** هجرتي audit_log و payment_idempotency، ثم `npx prisma migrate deploy` للتحقق.

---

## مراجع

- [Prisma: Baseline an existing production database](https://www.prisma.io/docs/guides/migrate/production-troubleshooting#baseline-an-existing-production-database)
