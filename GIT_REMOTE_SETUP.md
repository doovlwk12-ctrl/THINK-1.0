# تعليمات ربط المشروع بـ GitHub

## الخطوات المطلوبة

### 1. تهيئة Git (إذا لم يكن موجوداً)
```bash
git init
```

### 2. إضافة المستودع البعيد
```bash
git remote add origin https://github.com/doovlwk12-ctrl/THINK.git
```

### 3. التحقق من المستودع البعيد
```bash
git remote -v
```

### 4. إضافة جميع الملفات
```bash
git add .
```

### 5. عمل Commit
```bash
git commit -m "Initial commit - منصة فكرة v2.1.0"
```

### 6. رفع التغييرات إلى GitHub
```bash
# إذا كان المستودع فارغاً
git push -u origin main

# أو إذا كان المستودع يحتوي على ملفات
git pull origin main --allow-unrelated-histories
git push -u origin main
```

## ملاحظات مهمة

⚠️ **قبل الرفع:**
- تأكد من أن ملف `.env` موجود في `.gitignore` (موجود بالفعل ✅)
- تأكد من عدم رفع ملفات قاعدة البيانات الحساسة
- تأكد من عدم رفع `node_modules`

✅ **الملفات المحمية في `.gitignore`:**
- `.env` - ملفات البيئة
- `node_modules/` - التبعيات
- `.next/` - ملفات البناء
- `dev.db` - قاعدة البيانات المحلية
- `.vercel/` - إعدادات Vercel

## إذا واجهت مشاكل

### مشكلة: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/doovlwk12-ctrl/THINK.git
```

### مشكلة: "failed to push some refs"
```bash
git pull origin main --rebase
git push -u origin main
```

### مشكلة: المسار العربي في PowerShell
استخدم Git Bash أو CMD بدلاً من PowerShell:
```bash
# في Git Bash أو CMD
cd /c/Users/عبدالسلام/Documents/فكرة
git init
git remote add origin https://github.com/doovlwk12-ctrl/THINK.git
```
