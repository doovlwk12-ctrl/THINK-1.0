# دليل النشر - منصة فكرة

## 📋 نظرة عامة

هذا الدليل يشرح كيفية نشر منصة فكرة على بيئة الإنتاج.

---

## 🚀 النشر على Vercel (موصى به)

### المتطلبات

- حساب Vercel
- GitHub repository
- قاعدة بيانات PostgreSQL (للإنتاج) - SQLite للـ MVP فقط

### الخطوات

#### 1. إعداد المشروع

```bash
# تأكد من أن المشروع جاهز
npm run build

# تأكد من عدم وجود أخطاء
npm run lint
```

#### 2. رفع المشروع على GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

#### 3. النشر على Vercel

1. اذهب إلى [vercel.com](https://vercel.com)
2. اضغط "New Project"
3. اختر GitHub repository
4. Vercel سيكتشف Next.js تلقائياً
5. أضف Environment Variables:

```env
# قاعدة البيانات (للإنتاج - استخدم PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.vercel.app

# Push Notifications (اختياري)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

6. اضغط "Deploy"

#### 4. إعداد قاعدة البيانات

```bash
# على Vercel، استخدم Prisma Migrate
npx prisma migrate deploy

# أو استخدم Prisma Push للتطوير
npx prisma db push
```

---

## 🚀 النشر على Render

المشروع يستخدم **PostgreSQL** (انظر [prisma/schema.prisma](prisma/schema.prisma)). على Render استخدم **Web Service** (وليس Static Site) لأن التطبيق يشغّل خادم Next.js ومسارات API.

### المتطلبات

- حساب [Render](https://render.com)
- مستودع GitHub للمشروع
- قاعدة بيانات PostgreSQL (من Render أو خارجية)

### الخطوات

#### 1. إنشاء قاعدة بيانات PostgreSQL على Render

1. من [dashboard.render.com](https://dashboard.render.com): **New +** → **PostgreSQL**
2. اختر اسمًا (مثل `fekra-db`) والمنطقة، ثم **Create Database**
3. بعد الإنشاء انسخ **Internal Database URL** (ستضعه في `DATABASE_URL`)

#### 2. إنشاء Web Service

1. **New +** → **Web Service**
2. اربط مستودع GitHub واختر المستودع والفرع (مثل `main`)
3. الإعدادات:

| الحقل | القيمة |
|--------|--------|
| **Name** | مثلاً `fekra-platform` |
| **Runtime** | Node |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `npx prisma db push && npm start` |

لاحقاً يمكن استخدام `npx prisma migrate deploy && npm start` بعد إنشاء migration لـ PostgreSQL.

#### 3. متغيرات البيئة (Environment)

من الخدمة → **Environment** أضف:

| المفتاح | القيمة |
|---------|--------|
| `DATABASE_URL` | Internal Database URL من خطوة PostgreSQL |
| `NEXTAUTH_URL` | رابط الموقع بعد النشر، مثلاً `https://your-service.onrender.com` (بدون `/` في النهاية) |
| `NEXTAUTH_SECRET` | سلسلة عشوائية طويلة (32+ حرف)، أو استخدم "Generate" في لوحة Render |

اختياري: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` للتنبيهات.

#### 4. ملاحظات

- **الخطة المجانية:** المثيل يتوقف بعد فترة خمول؛ أول طلب قد يتأخر نحو 50 ثانية (cold start) ثم يعمل بشكل طبيعي.
- **الملفات المرفوعة:** القرص على Render غير دائم؛ استخدم تخزيناً خارجياً (مثل S3) للملفات في الإنتاج.
- بعد أي تغيير في Environment انقر **Manual Deploy** لإعادة النشر.

---

## 🗄️ إعداد قاعدة البيانات

### PostgreSQL على Railway

1. اذهب إلى [railway.app](https://railway.app)
2. أنشئ مشروع جديد
3. أضف PostgreSQL service
4. انسخ `DATABASE_URL`
5. أضفه في Vercel environment variables

### PostgreSQL على Supabase

1. اذهب إلى [supabase.com](https://supabase.com)
2. أنشئ مشروع جديد
3. اذهب إلى Settings > Database
4. انسخ Connection String
5. أضفه في Vercel environment variables

---

## 📦 إعداد File Storage

### AWS S3

1. أنشئ S3 bucket
2. أضف CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://your-domain.vercel.app"],
    "ExposeHeaders": []
  }
]
```

3. أضف Environment Variables في Vercel:

```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

### Cloudinary (أسهل)

1. اذهب إلى [cloudinary.com](https://cloudinary.com)
2. أنشئ حساب
3. انسخ credentials
4. أضف Environment Variables:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

## 🔔 إعداد Push Notifications

### إنشاء VAPID Keys

```bash
npm install -g web-push
web-push generate-vapid-keys
```

ستحصل على:
- Public Key
- Private Key

أضفهما في Vercel environment variables:

```env
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

---

## 🔒 إعداد الأمان

### HTTPS

Vercel يوفر HTTPS تلقائياً. لا حاجة لإعداد إضافي.

### Environment Variables

تأكد من إضافة جميع المتغيرات:

```env
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=generate-random-string-here
NEXTAUTH_URL=https://your-domain.vercel.app

# File Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...

# Push Notifications
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@yourdomain.com

# Optional
SENTRY_DSN=... # للـ error tracking
```

### Generate Secrets

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# أو استخدم
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 📱 إعداد PWA

### Manifest

تأكد من أن `public/manifest.json` محدث:

```json
{
  "name": "منصة فكرة",
  "short_name": "فكرة",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0ea5e9"
}
```

### Icons

تأكد من وجود جميع الأيقونات في `public/icons/`:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-192x192.png
- icon-512x512.png

---

## 🧪 الاختبار قبل النشر

### Checklist

- [ ] `npm run build` يعمل بدون أخطاء
- [ ] جميع Environment Variables محددة
- [ ] قاعدة البيانات متصلة
- [ ] File upload يعمل
- [ ] Push notifications تعمل
- [ ] PWA يعمل
- [ ] جميع الصفحات تعمل
- [ ] Authentication يعمل
- [ ] API endpoints تعمل

### اختبار محلي

```bash
# Build
npm run build

# Start production server
npm start

# اختبر على localhost:3000
```

---

## 🔄 CI/CD مع GitHub Actions

### `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 📊 Monitoring

### Vercel Analytics

1. اذهب إلى Project Settings
2. فعّل Analytics
3. راجع الإحصائيات في Dashboard

### Error Tracking (Sentry)

1. أنشئ حساب في [sentry.io](https://sentry.io)
2. أضف DSN في environment variables
3. أضف Sentry في المشروع:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

---

## 🔧 Troubleshooting

### مشاكل شائعة

#### 1. Database Connection Error

```bash
# تحقق من DATABASE_URL
# تأكد من أن قاعدة البيانات متاحة من الإنترنت
# تحقق من Firewall rules
```

#### 2. Build Fails

```bash
# تحقق من الأخطاء في build log
# تأكد من أن جميع dependencies مثبتة
# تحقق من TypeScript errors
```

#### 3. Environment Variables Not Working

```bash
# تأكد من إضافة المتغيرات في Vercel
# تأكد من إعادة Deploy بعد إضافة متغيرات جديدة
# تحقق من أسماء المتغيرات (case-sensitive)
```

#### 4. File Upload Not Working

```bash
# تحقق من S3/Cloudinary credentials
# تحقق من CORS settings
# تحقق من file size limits
```

---

## 📈 Performance Optimization

### 1. Enable Caching

```typescript
// في API routes
export const revalidate = 60 // 60 seconds
```

### 2. Image Optimization

```typescript
// استخدم Next.js Image component
import Image from 'next/image'
```

### 3. Code Splitting

```typescript
// استخدم dynamic imports
const Component = dynamic(() => import('./Component'))
```

---

## 🔄 Updates & Maintenance

### تحديث المشروع

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm update

# Test locally
npm run build
npm start

# Push to GitHub (Vercel سينشر تلقائياً)
git add .
git commit -m "Update dependencies"
git push
```

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name migration-name

# Apply to production
npx prisma migrate deploy
```

---

## 📞 الدعم

إذا واجهت مشاكل:

1. راجع [TIPS.md](./TIPS.md)
2. راجع [DOCUMENTATION.md](./DOCUMENTATION.md)
3. افتح Issue في GitHub
4. راجع Vercel logs

---

## ✅ Post-Deployment Checklist

بعد النشر:

- [ ] اختبر جميع الصفحات
- [ ] اختبر Authentication
- [ ] اختبر File Upload
- [ ] اختبر Push Notifications
- [ ] اختبر PWA installation
- [ ] راجع Analytics
- [ ] راجع Error logs
- [ ] اختبر على أجهزة مختلفة

---

**حظاً موفقاً في النشر! 🚀**
