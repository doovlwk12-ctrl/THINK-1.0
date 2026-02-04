# API Documentation - منصة فكرة

## 📋 نظرة عامة

هذا المستند يوثق جميع API endpoints في منصة فكرة.

**Base URL**: `/api`

**Authentication**: معظم endpoints تتطلب authentication header (NextAuth.js session)

**ملاحظات:**
- جميع الـ responses تستخدم JSON
- الأخطاء تُرجع `{ error: "رسالة الخطأ" }` مع status code مناسب
- التواريخ بصيغة ISO 8601
- الملفات تُرفع باستخدام FormData

### حالة الـ API (MVP)

**✅ Endpoints المكتملة:**
- `/api/auth/register` - التسجيل
- `/api/auth/[...nextauth]` - تسجيل الدخول (NextAuth)
- `/api/packages` - جلب الباقات
- `/api/orders/create` - إنشاء طلب
- `/api/orders/my-orders` - طلبات العميل
- `/api/orders/[id]` - تفاصيل الطلب
- `/api/payments/create` - الدفع المحاكي
- `/api/messages/send` - إرسال رسالة
- `/api/messages/[orderId]` - جلب الرسائل
- `/api/plans/upload` - رفع مخطط
- `/api/plans/[orderId]` - جلب مخططات الطلب
- `/api/plans/send` - إرسال مخطط للعميل
- `/api/engineer/orders` - طلبات المهندس
- `/api/engineer/orders/[id]` - تفاصيل طلب للمهندس
- `/api/engineer/orders/[id]/start` - بدء العمل على طلب

**⏳ Endpoints المتبقية:**
- `/api/revisions/create` - إنشاء طلب تعديل
- `/api/revisions/[id]` - تفاصيل طلب تعديل
- `/api/notifications/subscribe` - الاشتراك في Push Notifications
- `/api/notifications` - جلب الإشعارات
- `/api/orders/[id]/complete` - تأكيد إكمال الطلب
- `/api/engineer/orders/[id]/extend` - تمديد الموعد النهائي
- `/api/orders/[id]/buy-revisions` - شراء تعديلات إضافية
- `/api/admin/*` - لوحة تحكم الإدارة

---

## 🔐 Authentication APIs

### POST /api/auth/register

إنشاء حساب جديد.

**Request Body:**
```json
{
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "phone": "0501234567",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "clx...",
    "name": "أحمد محمد",
    "email": "ahmed@example.com",
    "phone": "0501234567",
    "role": "CLIENT"
  }
}
```

**Errors:**
- `400` - بيانات غير صحيحة
- `400` - البريد أو الجوال مستخدم بالفعل

---

### POST /api/auth/login

تسجيل الدخول.

**Request Body:**
```json
{
  "email": "ahmed@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "clx...",
    "name": "أحمد محمد",
    "email": "ahmed@example.com",
    "role": "CLIENT"
  }
}
```

**Errors:**
- `401` - بيانات الدخول غير صحيحة

---

## 📦 Orders APIs

### POST /api/orders/create

إنشاء طلب جديد.

**Authentication:** Required (CLIENT)

**Request Body:**
```json
{
  "packageId": "clx...",
  "formData": {
    "projectType": "سكني",
    "area": 200,
    "floors": 2,
    "bedrooms": 4,
    "bathrooms": 3,
    "parking": 2,
    "city": "الرياض",
    "district": "النخيل",
    "address": "شارع الملك فهد",
    "budget": 500000
  }
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "clx...",
    "orderNumber": "ORD-1234567890-ABC",
    "status": "PENDING",
    "remainingRevisions": 5,
    "deadline": "2024-02-15T00:00:00Z"
  }
}
```

---

### GET /api/orders/my-orders

الحصول على جميع طلبات المستخدم.

**Authentication:** Required

**Query Parameters:**
- `page` (optional) - رقم الصفحة (default: 1)
- `limit` (optional) - عدد العناصر (default: 20)
- `status` (optional) - تصفية حسب الحالة

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "clx...",
      "orderNumber": "ORD-1234567890-ABC",
      "status": "IN_PROGRESS",
      "package": {
        "nameAr": "الباقة القياسية",
        "price": 1000
      },
      "remainingRevisions": 3,
      "deadline": "2024-02-15T00:00:00Z",
      "createdAt": "2024-01-15T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### GET /api/orders/[id]

الحصول على تفاصيل طلب معين.

**Authentication:** Required (يجب أن يكون المستخدم صاحب الطلب أو مهندس معين)

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "clx...",
    "orderNumber": "ORD-1234567890-ABC",
    "status": "IN_PROGRESS",
    "client": {
      "id": "clx...",
      "name": "أحمد محمد",
      "email": "ahmed@example.com",
      "phone": "0501234567"
    },
    "engineer": {
      "id": "clx...",
      "name": "محمد علي"
    },
    "package": {
      "id": "clx...",
      "nameAr": "الباقة القياسية",
      "price": 1000,
      "revisions": 5,
      "executionDays": 14
    },
    "formData": { /* JSON object */ },
    "remainingRevisions": 3,
    "deadline": "2024-02-15T00:00:00Z",
    "plans": [
      {
        "id": "clx...",
        "fileUrl": "/uploads/plans/plan-123.pdf",
        "fileType": "pdf",
        "createdAt": "2024-01-20T00:00:00Z"
      }
    ]
  }
}
```

---

## 💬 Messages APIs

### POST /api/messages/send

إرسال رسالة في محادثة طلب.

**Authentication:** Required

**Request Body:**
```json
{
  "orderId": "clx...",
  "content": "مرحباً، متى سيكون المخطط جاهزاً؟"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "clx...",
    "orderId": "clx...",
    "senderId": "clx...",
    "sender": {
      "id": "clx...",
      "name": "أحمد محمد",
      "role": "CLIENT"
    },
    "content": "مرحباً، متى سيكون المخطط جاهزاً؟",
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

---

### GET /api/messages/[orderId]

الحصول على جميع رسائل محادثة طلب.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "clx...",
      "sender": {
        "id": "clx...",
        "name": "أحمد محمد",
        "role": "CLIENT"
      },
      "content": "مرحباً",
      "createdAt": "2024-01-20T10:00:00Z",
      "isRead": true
    },
    {
      "id": "clx...",
      "sender": {
        "id": "clx...",
        "name": "محمد علي",
        "role": "ENGINEER"
      },
      "content": "أهلاً وسهلاً",
      "createdAt": "2024-01-20T10:05:00Z",
      "isRead": false
    }
  ]
}
```

---

## 📐 Plans APIs

### POST /api/plans/upload

رفع مخطط جديد.

**Authentication:** Required (ENGINEER or ADMIN)

**Request:** FormData
- `file` - الملف (PDF أو صورة) - يتم ضغط الصور تلقائياً قبل الرفع
- `orderId` - رقم الطلب

**Response:**
```json
{
  "success": true,
  "plan": {
    "id": "clx...",
    "orderId": "clx...",
    "fileUrl": "/uploads/plans/plan-123.pdf",
    "fileType": "pdf",
    "isActive": false,
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

**ملاحظات:**
- يتم ضغط الصور تلقائياً قبل الرفع لتقليل الحجم
- المخطط المرفوع يكون غير نشط (`isActive: false`) حتى يتم إرساله للعميل عبر `/api/plans/send`
- يتم حفظ الملفات محلياً في `/public/uploads/plans/` (للـ MVP)

---

### GET /api/plans/[orderId]

الحصول على جميع مخططات طلب.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "plans": [
    {
      "id": "clx...",
      "fileUrl": "/uploads/plans/plan-123.pdf",
      "fileType": "pdf",
      "isActive": true,
      "createdAt": "2024-01-20T10:30:00Z"
    }
  ]
}
```

---

### POST /api/plans/send

إرسال مخطط للعميل (تفعيل مخطط وإلغاء تفعيل الباقي).

**Authentication:** Required (ENGINEER or ADMIN)

**Request Body:**
```json
{
  "orderId": "clx...",
  "planId": "clx..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم إرسال المخطط للعميل بنجاح"
}
```

**ملاحظات:**
- يتم تفعيل المخطط المحدد (`isActive: true`)
- يتم إلغاء تفعيل جميع المخططات الأخرى للطلب
- يتم تحديث حالة الطلب إلى `REVIEW`

**Errors:**
- `401` - غير مصرح
- `403` - فقط المهندسين يمكنهم إرسال المخططات
- `404` - الطلب أو المخطط غير موجود
- `400` - المخطط لا ينتمي لهذا الطلب

---

## 🔄 Revisions APIs

### POST /api/revisions/create

إنشاء طلب تعديل جديد.

**Authentication:** Required (CLIENT)

**Request Body:**
```json
{
  "orderId": "clx...",
  "pins": [
    {
      "x": 25.5,
      "y": 30.2,
      "color": "#ef4444",
      "note": "يرجى تغيير موقع المطبخ"
    },
    {
      "x": 60.0,
      "y": 45.0,
      "color": "#3b82f6",
      "note": "إضافة نافذة هنا"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "revision": {
    "id": "clx...",
    "orderId": "clx...",
    "planId": "clx...",
    "pins": "[...]",
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

**Errors:**
- `400` - لا توجد تعديلات متبقية
- `400` - لا يوجد مخطط متاح

---

### GET /api/revisions/[revisionId]

الحصول على تفاصيل طلب تعديل.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "revision": {
    "id": "clx...",
    "orderId": "clx...",
    "planId": "clx...",
    "pins": [
      {
        "x": 25.5,
        "y": 30.2,
        "color": "#ef4444",
        "note": "يرجى تغيير موقع المطبخ"
      }
    ],
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00Z",
    "order": {
      "id": "clx...",
      "orderNumber": "ORD-1234567890-ABC",
      "client": {
        "name": "أحمد محمد"
      }
    }
  }
}
```

---

### POST /api/revisions/[revisionId]/complete

إكمال طلب تعديل (للمهندس).

**Authentication:** Required (ENGINEER)

**Response:**
```json
{
  "success": true,
  "message": "تم إكمال طلب التعديل"
}
```

---

## 🔔 Notifications APIs

### POST /api/notifications/subscribe

الاشتراك في Push Notifications.

**Authentication:** Required

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم تفعيل الإشعارات بنجاح"
}
```

---

### POST /api/notifications/unsubscribe

إلغاء الاشتراك في Push Notifications.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "تم إلغاء تفعيل الإشعارات"
}
```

---

### GET /api/notifications

الحصول على إشعارات المستخدم.

**Authentication:** Required

**Query Parameters:**
- `page` (optional) - رقم الصفحة
- `limit` (optional) - عدد العناصر
- `unreadOnly` (optional) - إشعارات غير مقروءة فقط

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "clx...",
      "title": "تم إرسال المخطط",
      "body": "المهندس أرسل المخطط لطلبك",
      "type": "revision",
      "orderId": "clx...",
      "data": {
        "orderNumber": "ORD-1234567890-ABC",
        "action": "view_plan"
      },
      "isRead": false,
      "createdAt": "2024-01-20T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10
  },
  "unreadCount": 5
}
```

---

### POST /api/notifications/[id]/read

تحديد إشعار كمقروء.

**Authentication:** Required

**Response:**
```json
{
  "success": true
}
```

---

### POST /api/notifications/read-all

تحديد جميع الإشعارات كمقروءة.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "تم تحديد جميع الإشعارات كمقروءة"
}
```

---

### GET /api/notifications/vapid-public-key

الحصول على VAPID Public Key للإشعارات.

**Response:**
```json
{
  "publicKey": "BEl62iUYgUivxIkv69yViEuiBIa40HI..."
}
```

---

## 💳 Payment APIs

### POST /api/payments/create

إنشاء عملية دفع.

**Authentication:** Required (CLIENT)

**Request Body:**
```json
{
  "orderId": "clx...",
  "method": "card"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "clx...",
    "orderId": "clx...",
    "amount": 1000,
    "method": "card",
    "status": "completed",
    "transactionId": "TXN-1234567890",
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

---

## 👷 Engineer APIs

### GET /api/engineer/orders

الحصول على جميع طلبات المهندس (المخصصة له + الطلبات غير المخصصة).

**Authentication:** Required (ENGINEER or ADMIN)

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "clx...",
      "orderNumber": "ORD-1234567890-ABC",
      "status": "IN_PROGRESS",
      "engineerId": "clx...",
      "deadline": "2024-02-15T00:00:00Z",
      "createdAt": "2024-01-15T00:00:00Z",
      "client": {
        "id": "clx...",
        "name": "أحمد محمد",
        "email": "ahmed@example.com",
        "phone": "0501234567"
      },
      "package": {
        "nameAr": "الباقة القياسية",
        "price": 1000
      }
    }
  ]
}
```

**ملاحظات:**
- يعرض الطلبات المخصصة للمهندس الحالي (`engineerId`)
- يعرض أيضاً الطلبات غير المخصصة (`engineerId: null`) والحالة `PENDING` (يمكن للمهندس اختيارها)
- يتم ترتيب الطلبات حسب تاريخ الإنشاء (الأحدث أولاً)

---

### GET /api/engineer/orders/[id]

الحصول على تفاصيل طلب (للمهندس).

**Authentication:** Required (ENGINEER or ADMIN)

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "clx...",
    "orderNumber": "ORD-1234567890-ABC",
    "status": "IN_PROGRESS",
    "engineerId": "clx...",
    "remainingRevisions": 3,
    "deadline": "2024-02-15T00:00:00Z",
    "client": {
      "id": "clx...",
      "name": "أحمد محمد",
      "email": "ahmed@example.com",
      "phone": "0501234567"
    },
    "package": {
      "id": "clx...",
      "nameAr": "الباقة القياسية",
      "price": 1000,
      "revisions": 5,
      "executionDays": 14
    },
    "formData": { /* ... */ },
    "plans": [
      {
        "id": "clx...",
        "fileUrl": "/uploads/plans/plan-123.pdf",
        "fileType": "pdf",
        "isActive": true,
        "createdAt": "2024-01-20T10:30:00Z"
      }
    ]
  }
}
```

**ملاحظات:**
- يمكن للمهندس أو المدير الوصول للطلب
- يمكن للمهندس الوصول للطلبات غير المخصصة (`engineerId: null`) لعرضها واختيارها
- يعرض جميع المخططات (النشطة وغير النشطة)

---

### POST /api/engineer/orders/[id]/start

بدء العمل على طلب (تعيين المهندس وتغيير الحالة).

**Authentication:** Required (ENGINEER or ADMIN)

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "clx...",
    "status": "IN_PROGRESS",
    "engineerId": "clx..."
  }
}
```

**ملاحظات:**
- يتم تعيين المهندس الحالي للطلب (`engineerId`)
- يتم تغيير حالة الطلب إلى `IN_PROGRESS`
- يمكن للمهندس استخدام هذا الـ endpoint لاختيار طلبات غير مخصصة

---

### POST /api/engineer/orders/[id]/complete

إكمال طلب.

**Authentication:** Required (ENGINEER)

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "clx...",
    "status": "COMPLETED"
  }
}
```

---

### POST /api/engineer/orders/[id]/extend

تمديد الموعد النهائي لطلب.

**Authentication:** Required (ENGINEER)

**Request Body:**
```json
{
  "days": 7
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "clx...",
    "deadline": "2024-02-22T00:00:00Z"
  }
}
```

---

## 📦 Packages APIs

### GET /api/packages

الحصول على جميع الباقات النشطة.

**Response:**
```json
{
  "success": true,
  "packages": [
    {
      "id": "clx...",
      "nameAr": "الباقة الأساسية",
      "price": 500,
      "revisions": 2,
      "executionDays": 7,
      "isActive": true
    },
    {
      "id": "clx...",
      "nameAr": "الباقة القياسية",
      "price": 1000,
      "revisions": 5,
      "executionDays": 14,
      "isActive": true
    }
  ]
}
```

---

## 🔧 Admin APIs

### GET /api/admin/stats

الحصول على إحصائيات المنصة.

**Authentication:** Required (ADMIN)

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalOrders": 150,
    "totalUsers": 80,
    "totalRevenue": 125000,
    "activeEngineers": 5
  }
}
```

---

## ⚠️ Error Responses

جميع APIs ترجع نفس تنسيق الخطأ:

```json
{
  "error": "رسالة الخطأ بالعربية"
}
```

**Status Codes:**
- `200` - نجاح
- `201` - تم الإنشاء
- `400` - طلب غير صحيح
- `401` - غير مصرح (لم يتم تسجيل الدخول)
- `403` - محظور (لا توجد صلاحية)
- `404` - غير موجود
- `500` - خطأ في السيرفر

---

## 📝 ملاحظات

1. جميع التواريخ بصيغة ISO 8601 (UTC)
2. جميع IDs بصيغة CUID
3. جميع النصوص بالعربية (RTL)
4. File uploads تستخدم FormData
5. جميع الـ JSON responses تدعم RTL

---

## 🔐 Authentication

معظم APIs تتطلب authentication. أرسل token في header:

```
Authorization: Bearer <token>
```

أو استخدم cookie-based authentication (NextAuth.js).

---

## 📚 أمثلة

### JavaScript/TypeScript

```typescript
// إنشاء طلب
const response = await fetch('/api/orders/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    packageId: 'clx...',
    formData: { /* ... */ }
  })
})

const data = await response.json()
```

### cURL

```bash
# تسجيل الدخول
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ahmed@example.com","password":"password123"}'

# إنشاء طلب
curl -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"packageId":"clx...","formData":{...}}'
```

---

**آخر تحديث:** 2024-01-20
