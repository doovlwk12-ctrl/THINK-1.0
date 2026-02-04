# دليل تنظيم المسارات (Routing Guidelines)

## 📋 الهدف
تجنب تعارضات المسارات الديناميكية ومشاكل التنظيم في Next.js API Routes.

---

## 🚨 المشاكل الشائعة

### 1. تعارض أسماء Dynamic Segments
**المشكلة:**
```
❌ خطأ: استخدام أسماء مختلفة لنفس المستوى
/api/plans/[orderId]/route.ts
/api/plans/[planId]/route.ts
```

**السبب:** Next.js لا يمكنه التمييز بين `[orderId]` و `[planId]` في نفس المستوى.

**الحل:**
```
✅ صحيح: استخدام هيكل منطقي
/api/orders/[id]/plans/route.ts  (مخططات طلب معين)
/api/plans/[planId]/route.ts     (عملية على مخطط معين)
```

---

## 📐 قواعد تنظيم المسارات

### القاعدة 1: التسلسل الهرمي
استخدم التسلسل الهرمي المنطقي للموارد:

```
✅ صحيح:
/api/orders/[id]/plans/          → مخططات طلب معين
/api/orders/[id]/messages/        → رسائل طلب معين
/api/orders/[id]/revisions/      → تعديلات طلب معين
/api/plans/[planId]/              → عملية على مخطط معين (DELETE, GET)
/api/revisions/[revisionId]/      → تفاصيل تعديل معين
```

### القاعدة 2: أسماء Dynamic Segments
استخدم أسماء واضحة ومتسقة:

```
✅ صحيح:
[id]        → للـ ID العام (order, user, etc.)
[orderId]   → عندما يكون السياق واضح أنه order
[planId]    → عندما يكون السياق واضح أنه plan
[revisionId] → عندما يكون السياق واضح أنه revision
```

**تجنب:**
```
❌ خطأ:
[orderId] و [planId] في نفس المستوى
[id] و [orderId] في نفس المستوى بدون سياق واضح
```

### القاعدة 3: العمليات المحددة
ضع العمليات المحددة في مسارات منفصلة:

```
✅ صحيح:
/api/orders/[id]/complete/        → إكمال طلب
/api/orders/[id]/package/        → تحديث باقة طلب
/api/orders/[id]/buy-revisions/  → شراء تعديلات إضافية
/api/plans/send/                 → إرسال مخطط (POST)
/api/plans/upload/               → رفع مخطط (POST)
```

### القاعدة 4: تجنب التعارضات
قبل إنشاء مسار جديد، تحقق من:

1. **لا يوجد مسار ديناميكي آخر في نفس المستوى:**
   ```
   ❌ خطأ:
   /api/plans/[orderId]/
   /api/plans/[planId]/
   
   ✅ صحيح:
   /api/orders/[id]/plans/
   /api/plans/[planId]/
   ```

2. **استخدم query parameters للفلترة:**
   ```
   ✅ صحيح:
   GET /api/plans?orderId=xxx
   GET /api/messages?orderId=xxx&limit=10
   ```

---

## 🔍 فحص التعارضات

### قبل إنشاء مسار جديد:

1. **فحص الهيكل الحالي:**
   ```bash
   # ابحث عن جميع المسارات الديناميكية
   find app/api -name "route.ts" -type f | xargs grep -l "\[.*\]"
   ```

2. **تحقق من المستوى:**
   - هل يوجد مسار ديناميكي آخر في نفس المجلد؟
   - هل يمكن نقل المسار إلى مستوى أدنى (أكثر تحديداً)؟

3. **استخدم التسلسل الهرمي:**
   - الموارد الرئيسية → `/api/orders/[id]/`
   - الموارد الفرعية → `/api/orders/[id]/plans/`
   - العمليات المحددة → `/api/orders/[id]/complete/`

---

## 📝 أمثلة على الهيكل الصحيح

### مثال 1: Orders
```
/api/orders/
  ├── create/route.ts              → POST: إنشاء طلب جديد
  ├── my-orders/route.ts           → GET: طلباتي
  └── [id]/
      ├── route.ts                 → GET: تفاصيل طلب
      ├── complete/route.ts        → POST: إكمال طلب
      ├── package/route.ts         → PUT: تحديث باقة
      ├── buy-revisions/route.ts   → POST: شراء تعديلات
      ├── plans/route.ts           → GET: مخططات الطلب
      ├── messages/route.ts        → GET: رسائل الطلب
      └── revisions/route.ts       → GET: تعديلات الطلب
```

### مثال 2: Plans
```
/api/plans/
  ├── upload/route.ts              → POST: رفع مخطط
  ├── send/route.ts                → POST: إرسال مخطط
  └── [planId]/route.ts            → DELETE: حذف مخطط
```

### مثال 3: Revisions
```
/api/revisions/
  ├── [orderId]/route.ts          → GET: تعديلات طلب معين
  └── detail/
      └── [revisionId]/route.ts    → GET: تفاصيل تعديل معين
```

---

## 🛠️ أدوات التحقق

### 1. Script للتحقق من التعارضات
أنشئ ملف `scripts/check-routes.js`:

```javascript
const fs = require('fs')
const path = require('path')

function findDynamicRoutes(dir, basePath = '') {
  const routes = []
  const items = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    const routePath = path.join(basePath, item.name)
    
    if (item.isDirectory()) {
      // Check for dynamic segments
      if (item.name.startsWith('[') && item.name.endsWith(']')) {
        routes.push({
          type: 'dynamic',
          path: routePath,
          segment: item.name,
          fullPath
        })
      }
      routes.push(...findDynamicRoutes(fullPath, routePath))
    }
  }
  
  return routes
}

function checkConflicts() {
  const apiDir = path.join(process.cwd(), 'app', 'api')
  const routes = findDynamicRoutes(apiDir, '/api')
  
  // Group by parent directory
  const byParent = {}
  routes.forEach(route => {
    const parent = path.dirname(route.path)
    if (!byParent[parent]) {
      byParent[parent] = []
    }
    byParent[parent].push(route)
  })
  
  // Check for conflicts
  const conflicts = []
  Object.entries(byParent).forEach(([parent, routes]) => {
    if (routes.length > 1) {
      const segments = routes.map(r => r.segment)
      const uniqueSegments = new Set(segments)
      if (uniqueSegments.size > 1) {
        conflicts.push({
          parent,
          routes: routes.map(r => ({ path: r.path, segment: r.segment }))
        })
      }
    }
  })
  
  if (conflicts.length > 0) {
    console.error('❌ تم العثور على تعارضات في المسارات:')
    conflicts.forEach(conflict => {
      console.error(`\nالمجلد: ${conflict.parent}`)
      conflict.routes.forEach(route => {
        console.error(`  - ${route.path} (${route.segment})`)
      })
    })
    process.exit(1)
  } else {
    console.log('✅ لا توجد تعارضات في المسارات')
  }
}

checkConflicts()
```

### 2. إضافة إلى package.json
```json
{
  "scripts": {
    "check-routes": "node scripts/check-routes.js",
    "prebuild": "npm run check-routes"
  }
}
```

---

## ✅ Checklist قبل إنشاء مسار جديد

- [ ] تحقق من عدم وجود مسار ديناميكي آخر في نفس المستوى
- [ ] استخدم التسلسل الهرمي المنطقي (الموارد الرئيسية → الموارد الفرعية)
- [ ] اختر اسم dynamic segment واضح ومتسق
- [ ] ضع العمليات المحددة في مسارات منفصلة
- [ ] اختبر المسار بعد الإنشاء
- [ ] قم بتشغيل `npm run check-routes` للتحقق

---

## 🔄 إعادة الهيكلة

إذا اكتشفت تعارضاً:

1. **حدد المسار الأكثر منطقية:**
   - أي مسار يتبع التسلسل الهرمي بشكل أفضل؟
   - أي مسار يستخدم بشكل أكثر؟

2. **انقل الملف:**
   ```bash
   # مثال: نقل من /api/plans/[orderId] إلى /api/orders/[id]/plans
   mkdir -p app/api/orders/[id]/plans
   mv app/api/plans/[orderId]/route.ts app/api/orders/[id]/plans/route.ts
   ```

3. **حدّث الاستدعاءات:**
   ```bash
   # ابحث عن جميع الاستدعاءات
   grep -r "/api/plans/[orderId]" app/
   ```

4. **حدّث التوثيق:**
   - حدّث `API.md` إذا كان موجوداً
   - حدّث أي توثيق آخر

---

## 📚 مراجع

- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

## 🎯 ملخص القواعد الذهبية

1. **تسلسل هرمي منطقي:** الموارد الرئيسية → الموارد الفرعية
2. **أسماء متسقة:** استخدم `[id]` أو أسماء واضحة حسب السياق
3. **تجنب التعارضات:** لا تضع dynamic segments مختلفة في نفس المستوى
4. **فحص قبل الإنشاء:** استخدم script التحقق
5. **توثيق التغييرات:** حدّث التوثيق عند إعادة الهيكلة
