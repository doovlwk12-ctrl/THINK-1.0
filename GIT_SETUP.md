# 🔧 إعداد Git للمشروع (اختياري)

## 📋 ملاحظة
المشروع حالياً **ليس** مستودع Git. إذا كنت تريد استخدام Git لإدارة النسخ، اتبع الخطوات التالية.

---

## 🚀 إعداد Git للمشروع

### الخطوة 1: تهيئة Git

```bash
# الانتقال إلى مجلد المشروع
cd "c:\Users\عبدالسلام\Documents\فكرة"

# تهيئة Git
git init

# إضافة جميع الملفات
git add .

# إنشاء commit أولي
git commit -m "Initial commit: Platform checkpoint 2025-01-28"
```

### الخطوة 2: إنشاء نقطة الحفظ

```bash
# إنشاء tag للنقطة الحالية
git tag -a v2.0.0-checkpoint -m "Platform checkpoint before future modifications"

# عرض الـ tags
git tag
```

### الخطوة 3: إنشاء Branch للحفظ

```bash
# إنشاء branch جديد
git checkout -b checkpoint-2025-01-28

# العودة إلى main
git checkout main
```

---

## 📦 استخدام Git للنسخ الاحتياطي

### حفظ التغييرات

```bash
# إضافة التغييرات
git add .

# إنشاء commit
git commit -m "Description of changes"

# إنشاء tag جديد
git tag -a v2.0.1 -m "New version description"
```

### العودة إلى نقطة الحفظ

```bash
# عرض جميع الـ commits
git log --oneline

# العودة إلى commit معين
git checkout <commit-hash>

# أو استخدام الـ tag
git checkout v2.0.0-checkpoint

# إنشاء branch جديد من هذه النقطة
git checkout -b restore-from-checkpoint v2.0.0-checkpoint
```

---

## 🔄 العمل مع Branches

```bash
# إنشاء branch جديد للتعديلات
git checkout -b feature/new-feature

# العمل على التعديلات
# ... إجراء التعديلات ...

# حفظ التعديلات
git add .
git commit -m "Add new feature"

# العودة إلى main
git checkout main

# دمج التعديلات (إذا كانت ناجحة)
git merge feature/new-feature

# حذف branch بعد الدمج
git branch -d feature/new-feature
```

---

## ⚠️ تحذيرات

1. **لا تحذف الـ tags** - استخدمها كنسخ احتياطية
2. **احتفظ بـ main نظيفاً** - استخدم branches للتعديلات
3. **اختبر قبل الدمج** - تأكد من أن التعديلات تعمل
4. **وثّق التغييرات** - اكتب commit messages واضحة

---

## 📝 مثال على Workflow

```bash
# 1. إنشاء branch للتعديلات
git checkout -b feature/update-design

# 2. إجراء التعديلات
# ... تعديل الملفات ...

# 3. حفظ التعديلات
git add .
git commit -m "Update design system"

# 4. اختبار التعديلات
npm run build
npm run dev

# 5. إذا نجحت، دمجها
git checkout main
git merge feature/update-design

# 6. إذا فشلت، تجاهلها
git checkout main
git branch -D feature/update-design
```

---

## 🔍 أوامر مفيدة

```bash
# عرض الحالة
git status

# عرض التغييرات
git diff

# عرض التاريخ
git log --oneline --graph

# عرض الـ tags
git tag

# حذف branch
git branch -d branch-name

# حذف tag
git tag -d tag-name
```

---

**ملاحظة:** Git اختياري. يمكنك استخدام النسخ اليدوي أيضاً كما هو موضح في `BACKUP_INSTRUCTIONS.md`.
