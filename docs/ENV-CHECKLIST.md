# قائمة متغيرات البيئة (.env) — للتحقق والإدخال

## للمطور المحلي أو Vercel

---

## مطلوب (للتشغيل الأساسي)

| # | المتغير | الوصف | من أين؟ | مثال |
|---|---------|-------|---------|------|
| 1 | **DATABASE_URL** | رابط قاعدة بيانات PostgreSQL | Supabase → Settings → Database → URI (Transaction) | `postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true` |
| 2 | **NEXTAUTH_SECRET** | مفتاح سري لتشفير الجلسات | أنشئه: `openssl rand -base64 32` | قيمة عشوائية 32+ حرف |
| 3 | **NEXTAUTH_URL** | رابط الموقع | محلي: `http://localhost:3000` / Vercel: `https://fekre.vercel.app` | `https://fekre.vercel.app` |

---

## مطلوب لـ Supabase (التخزين + اختيارياً المصادقة)

| # | المتغير | الوصف | من أين؟ | مثال |
|---|---------|-------|---------|------|
| 4 | **NEXT_PUBLIC_SUPABASE_URL** | رابط مشروع Supabase | Supabase → Settings → API → Project URL | `https://xxxxx.supabase.co` |
| 5 | **NEXT_PUBLIC_SUPABASE_ANON_KEY** | المفتاح العام (Publishable) | Supabase → Settings → API → anon public | يبدأ بـ `eyJ...` |
| 6 | **SUPABASE_SERVICE_ROLE_KEY** | المفتاح السري (Service Role) | Supabase → Settings → API → service_role | يبدأ بـ `eyJ...` |
| 7 | **NEXT_PUBLIC_USE_SUPABASE_AUTH** | استخدام Supabase كمصادقة؟ | يدوي: `true` أو `false` | `false` إذا تستخدم NextAuth فقط |

---

## اختياري (يمكن حذفه أو تركه فارغاً)

| # | المتغير | الوصف | من أين؟ | متى تضيفه؟ |
|---|---------|-------|---------|------------|
| 8 | **USE_SUPABASE_AUTH** | تكرار للمصادقة (سيرفر) | نفس قيمة NEXT_PUBLIC_USE_SUPABASE_AUTH | يمكن حذفه — يكفي رقم 7 |
| 9 | **NODE_ENV** | بيئة التشغيل | `development` أو `production` | Vercel يضبطه تلقائياً — يمكن حذفه |
| 10 | **CRON_SECRET** | لتأمين مسار Cron | أنشئه عشوائياً (حروف وأرقام) | عند استخدام Cron لحذف الأرشيف |
| 11 | **HEALTH_CHECK_SECRET** | لتأمين مسار الصحة | أنشئه عشوائياً | عند استخدام `/api/system/health` |
| 12 | **MIGRATION_TEMP_PASSWORD** | كلمة مرور مؤقتة للمزامنة | تختارها أنت | عند تشغيل سكربت sync-prisma-to-supabase-auth |
| 13 | **SKIP_MESSAGES_AUTH** | تعطيل التحقق في الرسائل | `true` أو `false` | للتجربة فقط — لا تستخدمه في الإنتاج |
| 14 | **HEALTH_CHECK_SECRET** | حماية مسار الصحة | قيمة عشوائية | اختياري |

---

## ملخص للمراجعة السريعة

### Vercel (الإنتاج) — يجب وجودها:
```
✓ DATABASE_URL          (المنفذ 6543 + ?pgbouncer=true)
✓ NEXTAUTH_SECRET
✓ NEXTAUTH_URL          (https://fekre.vercel.app)
✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_ROLE_KEY
✓ NEXT_PUBLIC_USE_SUPABASE_AUTH   (false)
```

### اختياري على Vercel:
```
○ CRON_SECRET           (إن أردت Cron)
○ HEALTH_CHECK_SECRET   (إن أردت فحص الصحة)
○ NODE_ENV=production   (Vercel يضبطه تلقائياً)
```

### يمكن حذفهما (تكرار):
```
✗ USE_SUPABASE_AUTH     (يكفي NEXT_PUBLIC_USE_SUPABASE_AUTH)
```
