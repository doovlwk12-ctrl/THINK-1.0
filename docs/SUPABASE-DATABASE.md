# Supabase كقاعدة بيانات (PostgreSQL) — وسبب الأخطاء عند الربط

المشروع **موحّد الآن على PostgreSQL فقط** (لا SQLite). يعمل على **كل من المحلي و Supabase** بتغيير `DATABASE_URL` فقط.

---

## الوضع الحالي: مشروع PostgreSQL بالكامل ✅

- **`prisma/schema.prisma`:** `provider = "postgresql"`.
- **التبديل بين محلي و Supabase:** عبر `.env` فقط (قيمة `DATABASE_URL`).

### تشغيل محلي (PostgreSQL على جهازك)

1. شغّل PostgreSQL محلياً، مثلاً:
   - **Docker:**  
     `docker run -d --name think-postgres -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=think_db -p 5432:5432 postgres:16`
   - أو تثبيت Postgres على الجهاز ثم إنشاء قاعدة `think_db`.
2. في **`.env`:**  
   `DATABASE_URL="postgresql://user:password@localhost:5432/think_db"`
3. إنشاء الجداول (مرة واحدة): **`npx prisma db push`**
4. تشغيل التطبيق: **`npm run dev`**

### تشغيل على Supabase

1. في **`.env`:** ضع **`DATABASE_URL`** من Supabase (Project Settings → Database → Connection string)، مع **`?sslmode=require`** إن لزم.
2. إنشاء الجداول (مرة واحدة): **`npx prisma db push`**
3. تشغيل التطبيق: **`npm run dev`** (أو النشر على السيرفر).

**لماذا `db push` أول مرة؟** المايجريشنات القديمة خليط SQLite/Postgres؛ الـ push يبني الجداول من الـ schema الحالي على Postgres مباشرة. بعد ذلك يمكن استخدام **`prisma migrate dev`** لأي تغيير جديد على الـ schema وتوليد مايجريشنات Postgres نظيفة.

### نقل بيانات من SQLite (مرة واحدة)

إذا كان لديك بيانات قديمة في ملف SQLite (`prisma/dev.db` أو `prisma/prisma/dev.db`):

1. ضع **`DATABASE_URL`** في `.env` يشير إلى PostgreSQL (محلي أو Supabase).
2. شغّل **`npx prisma db push`** لإنشاء الجداول على Postgres.
3. شغّل **`npm run db:migrate-sqlite-to-postgres`** لنقل البيانات من SQLite إلى Postgres.
4. بعد التحقق من البيانات احذف ملف SQLite يدوياً إن بقي (المشروع لا يستخدمه بعد الآن).

---

## هل المشكلة من الكود أم من طريقة الربط؟

**الاثنان معاً:**

1. **من المشروع (Prisma):**  
   المشروع كان أو أصبح يستخدم **SQLite** في `schema.prisma` بينما مجلد **المايجريشنات** فيه خليط: بعض الملفات بصيغة **SQLite** (مثل `DATETIME`, `REAL`) وبعضها بصيغة **PostgreSQL** (مثل `TIMESTAMP(3)`, `CONSTRAINT "..." PRIMARY KEY`).  
   ملف **`migration_lock.toml`** كان مضبوطاً على `provider = "postgresql"`.  
   عند التشغيل مع **Supabase** (قاعدة PostgreSQL):
   - إن بقيت `schema.prisma` على `sqlite` ووضعت `DATABASE_URL` لـ Supabase → Prisma يحاول يتصل بـ Postgres بعقلية SQLite فيُحدث أخطاء.
   - إن غيّرت الـ provider إلى `postgresql` ثم شغّلت `prisma migrate deploy` → بعض المايجريشنات القديمة بصيغة SQLite قد تفشل على Postgres.

2. **من طريقة الربط مع Supabase:**
   - Supabase يعطي **PostgreSQL** فقط (لا SQLite).
   - رابط الاتصال يجب أن يكون صحيحاً (من لوحة Supabase → Project Settings → Database).
   - غالباً تحتاج **SSL** في الإنتاج (مثلاً `?sslmode=require` في الـ URI).
   - إن استخدمت **Connection pooling** (مثل PgBouncer) يُفضّل استخدام **Transaction mode** مع `?pgbouncer=true` في الـ URI للنشر.

لذلك: **المشكلة ليست من الكود فقط ولا من الربط فقط** — بل من تطابق (أو عدم تطابق) بين: نوع القاعدة في Prisma، صيغة المايجريشنات، وطريقة ربط Supabase.

---

## لماذا SQLite المحلي اشتغل؟

- في **SQLite**:
  - `schema.prisma` فيه `provider = "sqlite"` و `url = env("DATABASE_URL")` مع `DATABASE_URL="file:./prisma/dev.db"`.
  - لا حاجة لشبكة ولا SSL ولا Supabase.
  - Prisma يخلق/يحدّث الجداول من الـ schema (عبر `db push` أو ما يطابق ذلك) دون الاعتماد على مايجريشنات مكتوبة لـ Postgres.
- فلم يكن هناك تناقض بين “نوع القاعدة” و “صيغة المايجريشنات” ولا مشاكل اتصال، فاشتغل المشروع محلياً.

---

## لو أردت استخدام Supabase كقاعدة بيانات لاحقاً

1. **توحيد الـ provider على PostgreSQL**
   - في `prisma/schema.prisma` غيّر:
     - `provider = "sqlite"` → `provider = "postgresql"`
     - واترك `url = env("DATABASE_URL")`.

2. **ضبط `DATABASE_URL` من Supabase**
   - من لوحة Supabase: **Project Settings → Database**.
   - انسخ **Connection string** (URI).  
   - للإنتاج أو إن طُلِب منك SSL أضف في نهاية الـ URI:  
     `?sslmode=require`  
     أو استخدم الـ URI الذي يأتي مع **Session mode** / **Transaction mode** حسب الطريقة التي تنشر بها (مثلاً مع `?pgbouncer=true` إن استخدمت Pooler).

3. **المايجريشنات**
   - المايجريشنات الحالية خليط SQLite/Postgres. الخيارات:
     - **الخيار الآمن:** إنشاء قاعدة Postgres جديدة (مثلاً مشروع Supabase جديد أو فرع) ثم تشغيل **`npx prisma db push`** مرة واحدة لمطابقة الـ schema الحالي على Postgres (بدون الاعتماد على المايجريشنات القديمة)، ثم لاحقاً إدارة التغييرات عبر **`prisma migrate dev`** لتوليد مايجريشنات Postgres نظيفة.
     - أو الاحتفاظ بنسخة من البيانات والـ schema وإعادة تطبيقها على Postgres ثم الاعتماد على migrate للمستقبل.

4. **ملف `migration_lock.toml`**
   - في المشروع حالياً `prisma/migrations/migration_lock.toml` مضبوط على `provider = "postgresql"` بينما `schema.prisma` يستخدم `provider = "sqlite"`. هذا بقايا إعداد سابق.
   - للتطوير المحلي مع SQLite الاعتماد على **`npx prisma db push`** لمطابقة الـ schema مع الملف `dev.db` (لا حاجة لتشغيل المايجريشنات القديمة).
   - عند الانتقال لـ Supabase غيّر الـ provider في `schema.prisma` إلى `postgresql` وأبقِ الـ lock على `postgresql` ثم استخدم `db push` أو أصلح المايجريشنات كما سبق.

5. **بعد التعديل**
   - أوقف الخادم، احذف `.next` إن لزم، ثم `npm run dev`.
   - تأكد أن مشروع Supabase **نشط** (غير Paused).

---

## ملخص

| الوضع              | سبب النجاح / الفشل |
|--------------------|---------------------|
| **محلي + SQLite**  | الـ schema موحّد على SQLite، لا اتصال خارجي، فاشتغل. |
| **Supabase (Postgres)** | يحتاج `provider = "postgresql"` وربط صحيح وربما إصلاح/توحيد المايجريشنات؛ عدم ذلك يسبب أخطاء. |

المشكلة إذن: **تناقض بين إعداد Prisma (وقاعدة البيانات) وطريقة الربط مع منصة Supabase (PostgreSQL)**، وليس بالضرورة خطأ في “منطق الكود” وحده.
