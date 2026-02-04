# المعمارية - منصة فكرة

## 📐 نظرة عامة على المعمارية

منصة فكرة تستخدم **Layered Architecture** مع **Next.js App Router** لتوفير بنية قابلة للتوسع والصيانة.

## 🏗️ البنية المعمارية

```
┌─────────────────────────────────────────┐
│         Presentation Layer               │
│  - Next.js Pages (App Router)           │
│  - React Components                      │
│  - Client-side State Management         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         API Gateway Layer                │
│  - Next.js API Routes                   │
│  - Authentication Middleware             │
│  - Request Validation                    │
│  - Rate Limiting                         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Business Logic Layer                │
│  - Service Functions                     │
│  - Notification Templates                │
│  - Order Management                      │
│  - File Upload Service                   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Data Access Layer                │
│  - Prisma ORM                            │
│  - Database Queries                      │
│  - Data Validation                       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Data Storage Layer               │
│  - PostgreSQL Database                  │
│  - File Storage (S3/Cloudinary)         │
│  - Cache (Redis - optional)              │
└─────────────────────────────────────────┘
```

## 📁 هيكل المشروع التفصيلي

```
fekra-platform/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route Group للمصادقة
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   │
│   ├── (client)/                 # Route Group للعميل
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── orders/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── chat/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── revision/
│   │   │   │       └── page.tsx
│   │   │   └── create/
│   │   │       └── page.tsx
│   │   └── profile/
│   │       └── page.tsx
│   │
│   ├── (engineer)/                # Route Group للمهندس
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── orders/
│   │       └── [id]/
│   │           ├── page.tsx
│   │           └── chat/
│   │               └── page.tsx
│   │
│   ├── (admin)/                   # Route Group للإدارة
│   │   └── dashboard/
│   │       └── page.tsx
│   │
│   ├── api/                       # API Routes
│   │   ├── auth/
│   │   │   ├── register/
│   │   │   │   └── route.ts
│   │   │   └── login/
│   │   │       └── route.ts
│   │   │
│   │   ├── orders/
│   │   │   ├── create/
│   │   │   │   └── route.ts
│   │   │   ├── my-orders/
│   │   │   │   └── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   │
│   │   ├── messages/
│   │   │   ├── send/
│   │   │   │   └── route.ts
│   │   │   └── [orderId]/
│   │   │       └── route.ts
│   │   │
│   │   ├── plans/
│   │   │   ├── upload/
│   │   │   │   └── route.ts
│   │   │   └── [orderId]/
│   │   │       └── route.ts
│   │   │
│   │   ├── revisions/
│   │   │   ├── create/
│   │   │   │   └── route.ts
│   │   │   └── [revisionId]/
│   │   │       └── route.ts
│   │   │
│   │   └── notifications/
│   │       ├── subscribe/
│   │       │   └── route.ts
│   │       └── route.ts
│   │
│   ├── layout.tsx                 # Root Layout
│   ├── page.tsx                    # Home Page
│   └── globals.css                 # Global Styles
│
├── components/                     # React Components
│   ├── shared/                     # Shared Components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   └── Loading.tsx
│   │
│   ├── features/                   # Feature-specific Components
│   │   ├── orders/
│   │   │   ├── OrderCard.tsx
│   │   │   └── OrderForm.tsx
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   └── MessageBubble.tsx
│   │   └── revisions/
│   │       ├── RevisionEditor.tsx
│   │       └── PinMarker.tsx
│   │
│   ├── notifications/              # Notification Components
│   │   ├── NotificationBell.tsx
│   │   ├── NotificationDropdown.tsx
│   │   └── NotificationActions.tsx
│   │
│   └── pwa/                        # PWA Components
│       ├── PWAInstallPrompt.tsx
│       ├── OfflineIndicator.tsx
│       └── UpdateAvailable.tsx
│
├── lib/                            # Utility Libraries
│   ├── prisma.ts                   # Prisma Client
│   ├── auth.ts                     # Auth Helpers
│   ├── api.ts                      # API Client
│   ├── push-notifications.ts       # Push Notifications
│   ├── notification-templates.ts    # Notification Templates
│   └── utils.ts                     # Utility Functions
│
├── hooks/                          # Custom React Hooks
│   ├── useApi.ts
│   ├── useNotifications.ts
│   ├── usePWA.ts
│   └── useOrders.ts
│
├── types/                          # TypeScript Types
│   ├── order.ts
│   ├── user.ts
│   └── notification.ts
│
├── schemas/                        # Zod Schemas
│   ├── orderSchema.ts
│   ├── userSchema.ts
│   └── messageSchema.ts
│
├── middleware/                     # Custom Middleware
│   ├── auth.ts
│   └── errorHandler.ts
│
├── prisma/                         # Prisma Files
│   ├── schema.prisma
│   └── migrations/
│
├── public/                         # Static Files
│   ├── icons/                      # PWA Icons
│   ├── uploads/                    # Uploaded Files
│   ├── manifest.json
│   └── sw.js                       # Service Worker
│
└── config/                         # Configuration
    ├── database.ts
    └── constants.ts
```

## 🔄 تدفق البيانات

### 1. إنشاء طلب جديد

```
User (Frontend)
    ↓
[Create Order Form]
    ↓
POST /api/orders/create
    ↓
[Validate Input] (Zod)
    ↓
[Check Authentication] (Middleware)
    ↓
[Create Order] (Prisma)
    ↓
[Send Notification] (Notification Service)
    ↓
[Return Response]
    ↓
User (Frontend)
```

### 2. إرسال رسالة

```
User (Frontend)
    ↓
[Chat Input]
    ↓
POST /api/messages/send
    ↓
[Validate & Authenticate]
    ↓
[Save Message] (Prisma)
    ↓
[Send Push Notification] (Notification Service)
    ↓
[Real-time Update] (Socket.io - optional)
    ↓
Recipient (Frontend)
```

### 3. رفع مخطط

```
Engineer (Frontend)
    ↓
[File Upload]
    ↓
POST /api/plans/upload (FormData)
    ↓
[Validate File]
    ↓
[Upload to Storage] (S3/Cloudinary)
    ↓
[Save Plan Record] (Prisma)
    ↓
[Send Notification] (Notification Service)
    ↓
Client (Frontend)
```

## 🗄️ قاعدة البيانات

### Entity Relationship Diagram

```
User (1) ────< (N) Order
User (1) ────< (N) Message
User (1) ────< (N) Notification

Order (1) ────< (N) Plan
Order (1) ────< (N) Message
Order (1) ────< (N) RevisionRequest
Order (1) ────< (N) Notification

Package (1) ────< (N) Order

Plan (1) ────< (N) RevisionRequest
```

### Indexes Strategy

```prisma
// User
@@index([email])
@@index([phone])

// Order
@@index([clientId])
@@index([engineerId])
@@index([status])
@@index([orderNumber])

// Message
@@index([orderId])
@@index([senderId])
@@index([orderId, createdAt])

// Notification
@@index([userId, isRead])
@@index([userId, createdAt])
```

## 🔐 نظام المصادقة

### Authentication Flow

```
1. User submits credentials
   ↓
2. POST /api/auth/login
   ↓
3. Validate credentials
   ↓
4. Check password (bcrypt)
   ↓
5. Generate session token (JWT)
   ↓
6. Return user data + token
   ↓
7. Store token (localStorage/cookie)
   ↓
8. Include token in subsequent requests
```

### Authorization

```typescript
// Role-based access control
enum UserRole {
  CLIENT    // يمكنه إنشاء طلبات والوصول لطلباته فقط
  ENGINEER  // يمكنه الوصول للطلبات المعينة له
  ADMIN     // وصول كامل
}
```

## 📡 Real-time Communication

### Socket.io Architecture (اختياري)

```
Client Browser
    ↓
Socket.io Client
    ↓
Next.js API Route (/api/socket)
    ↓
Socket.io Server
    ↓
Broadcast to relevant clients
    ↓
Recipient Browser
```

### Fallback Strategy

```
1. Try WebSocket connection
   ↓
2. If fails, use HTTP polling
   ↓
3. If fails, use simple polling (setInterval)
```

## 🔔 نظام الإشعارات

### Notification Flow

```
Event Occurs (e.g., new message)
    ↓
Notification Service
    ↓
Create Notification Record (Database)
    ↓
Check User Push Subscription
    ↓
Send Push Notification (Web Push API)
    ↓
Service Worker receives notification
    ↓
Display browser notification
    ↓
User clicks notification
    ↓
Navigate to relevant page
```

## 📦 State Management

### Client-side State

```
Component State (useState)
    ↓
Custom Hooks (useOrders, useNotifications)
    ↓
API Calls (useApi)
    ↓
Server State (Database)
```

### Server-side State

```
Next.js Server Components
    ↓
Direct Database Access (Prisma)
    ↓
No client-side state needed
```

## 🚀 Performance Optimizations

### 1. Code Splitting
```typescript
// Dynamic imports
const HeavyComponent = dynamic(() => import('./HeavyComponent'))
```

### 2. Image Optimization
```typescript
// Next.js Image component
<Image src="/plan.jpg" width={800} height={600} />
```

### 3. Caching Strategy
```typescript
// API Route caching
export const revalidate = 60 // 60 seconds

// Static generation
export const dynamic = 'force-static'
```

### 4. Database Optimization
```typescript
// Select only needed fields
const order = await prisma.order.findUnique({
  where: { id },
  select: { id: true, orderNumber: true } // Only needed fields
})
```

## 🔒 Security Architecture

### Security Layers

```
1. Input Validation (Zod)
   ↓
2. Authentication (JWT)
   ↓
3. Authorization (Role-based)
   ↓
4. Rate Limiting
   ↓
5. SQL Injection Prevention (Prisma)
   ↓
6. XSS Prevention (React)
   ↓
7. CSRF Protection
```

## 📊 Monitoring & Logging

### Logging Strategy

```
Application Logs
    ↓
Console (Development)
    ↓
File System (Production)
    ↓
External Service (Sentry, LogRocket)
```

### Monitoring Points

- API Response Times
- Error Rates
- Database Query Performance
- User Activity
- Notification Delivery Rates

## 🧪 Testing Strategy

### Test Types

```
Unit Tests
  - Utility functions
  - Business logic
  ↓
Integration Tests
  - API endpoints
  - Database operations
  ↓
E2E Tests
  - User flows
  - Critical paths
```

## 🚢 Deployment Architecture

### Production Setup

```
Vercel/Netlify (Frontend)
    ↓
Next.js API Routes
    ↓
PostgreSQL (Database)
    ↓
AWS S3 (File Storage)
    ↓
Cloudflare (CDN)
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://...

# File Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...

# Push Notifications
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

---

## 📚 ملاحظات إضافية

### Scalability Considerations

1. **Database**: استخدم Read Replicas للقراءات الكثيفة
2. **Caching**: استخدم Redis للبيانات المتكررة
3. **File Storage**: استخدم CDN للملفات
4. **API**: استخدم Rate Limiting لمنع Abuse

### Future Improvements

1. Microservices Architecture (إذا نما المشروع)
2. Message Queue (RabbitMQ/Redis) للإشعارات
3. Search Functionality (Elasticsearch)
4. Analytics Dashboard

---

هذه المعمارية مصممة لتكون:
- ✅ **قابلة للتوسع** - يمكن إضافة ميزات جديدة بسهولة
- ✅ **قابلة للصيانة** - كود منظم وواضح
- ✅ **آمنة** - طبقات أمان متعددة
- ✅ **سريعة** - تحسينات أداء في كل طبقة
