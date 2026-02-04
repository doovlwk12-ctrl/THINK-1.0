# خطة التحسين التفصيلية - منصة فكرة

هذا الملف يحتوي على خطة عمل تفصيلية لتحسين المشروع بناءً على تقرير الفحص.

---

## 🎯 الأهداف

1. **الأمان:** جعل المشروع آمناً للإنتاج
2. **الاستقرار:** ضمان استقرار البيانات والعمليات
3. **الأداء:** تحسين الأداء والقابلية للتوسع
4. **الجودة:** تحسين جودة الكود والصيانة

---

## 📅 الجدول الزمني

### الأسبوع 1-2: الأمان (حرج)

#### اليوم 1-2: Rate Limiting & Security Headers

**المهام:**
1. إضافة Rate Limiting middleware
2. إضافة Security Headers
3. إضافة CSRF Protection

**الملفات المطلوب تعديلها:**
- `middleware.ts` - إضافة rate limiting
- `next.config.js` - إضافة security headers

**الكود المطلوب:**

```typescript
// middleware.ts
import rateLimit from 'express-rate-limit'
import { NextResponse } from 'next/server'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})

// Apply to API routes
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Apply rate limiting
  }
  // ... existing code
}
```

```javascript
// next.config.js
const nextConfig = {
  // ... existing config
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // ... existing headers
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}
```

**الاختبار:**
- اختبار rate limiting
- اختبار security headers

---

#### اليوم 3-4: Error Handling & Logging

**المهام:**
1. إنشاء Error Handler موحد
2. إضافة Logger بدلاً من console.log
3. إصلاح تسريب المعلومات

**الملفات المطلوب إنشاؤها:**
- `lib/errors.ts` - Error handler موحد
- `lib/logger.ts` - Logger

**الكود المطلوب:**

```typescript
// lib/errors.ts
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { logger } from './logger'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export function handleApiError(error: unknown): Response {
  // Zod validation errors
  if (error instanceof ZodError) {
    return Response.json(
      { success: false, error: error.errors[0].message },
      { status: 400 }
    )
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return Response.json(
          { success: false, error: 'القيمة موجودة مسبقاً' },
          { status: 400 }
        )
      case 'P2025':
        return Response.json(
          { success: false, error: 'السجل غير موجود' },
          { status: 404 }
        )
      default:
        logger.error('Prisma error', { error })
        return Response.json(
          { success: false, error: 'حدث خطأ في قاعدة البيانات' },
          { status: 500 }
        )
    }
  }

  // App errors
  if (error instanceof AppError) {
    return Response.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    )
  }

  // Unknown errors
  const errorId = crypto.randomUUID()
  logger.error('Unknown error', { errorId, error })
  
  return Response.json(
    { 
      success: false, 
      error: process.env.NODE_ENV === 'development' 
        ? `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        : 'حدث خطأ ما',
      ...(process.env.NODE_ENV === 'development' && { errorId })
    },
    { status: 500 }
  )
}
```

```typescript
// lib/logger.ts
type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  metadata?: Record<string, any>
}

class Logger {
  private log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata,
    }

    // In production, send to logging service (e.g., Sentry, LogRocket)
    if (process.env.NODE_ENV === 'production') {
      // Send to logging service
      // Example: Sentry.captureMessage(message, { level, extra: metadata })
    } else {
      // In development, use console
      console[level](JSON.stringify(entry, null, 2))
    }
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log('info', message, metadata)
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log('warn', message, metadata)
  }

  error(message: string, metadata?: Record<string, any>) {
    this.log('error', message, metadata)
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.log('debug', message, metadata)
  }
}

export const logger = new Logger()
```

**الاستخدام في API routes:**

```typescript
// app/api/orders/create/route.ts
import { handleApiError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // ... existing code
  } catch (error) {
    logger.error('Create order failed', { userId: session?.user?.id, error })
    return handleApiError(error)
  }
}
```

---

#### اليوم 5-7: File Storage Migration

**المهام:**
1. إعداد S3/Cloudinary
2. نقل منطق رفع الملفات
3. إضافة File Validation

**الملفات المطلوب إنشاؤها:**
- `lib/storage.ts` - Storage service
- `.env.example` - تحديث متغيرات البيئة

**الكود المطلوب:**

```typescript
// lib/storage.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

interface UploadOptions {
  folder: string
  maxSize?: number
  allowedTypes?: string[]
}

export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<string> {
  // Validate file size
  if (options.maxSize && file.size > options.maxSize) {
    throw new Error(`File size exceeds ${options.maxSize} bytes`)
  }

  // Validate file type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed`)
  }

  // Generate unique filename
  const extension = file.name.split('.').pop()
  const fileName = `${options.folder}/${randomUUID()}.${extension}`

  // Convert file to buffer
  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload to S3
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read',
    })
  )

  // Return public URL
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`
}

// For Cloudinary alternative
// import { v2 as cloudinary } from 'cloudinary'
// export async function uploadToCloudinary(file: File, folder: string) { ... }
```

**تحديث API route:**

```typescript
// app/api/plans/upload/route.ts
import { uploadFile } from '@/lib/storage'

export async function POST(request: NextRequest) {
  // ... existing validation

  try {
    const fileUrl = await uploadFile(file, {
      folder: 'plans',
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    })

    // Create plan record
    const plan = await prisma.plan.create({
      data: {
        orderId,
        fileUrl,
        fileType: file.type.startsWith('image/') ? 'image' : 'pdf',
        fileName: file.name,
        fileSize: file.size,
        isActive: false,
      },
    })

    return Response.json({ success: true, plan })
  } catch (error) {
    return handleApiError(error)
  }
}
```

---

#### اليوم 8-10: Input Sanitization & Validation

**المهام:**
1. إضافة Input Sanitization
2. تحسين Validation
3. إضافة Environment Validation

**الملفات المطلوب إنشاؤها:**
- `lib/sanitize.ts` - Sanitization utilities
- `lib/env.ts` - Environment validation

**الكود المطلوب:**

```typescript
// lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
  })
}

export function sanitizeText(text: string): string {
  // Remove HTML tags
  const withoutHtml = text.replace(/<[^>]*>/g, '')
  // Remove script tags
  const withoutScripts = withoutHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  // Trim whitespace
  return withoutScripts.trim()
}
```

```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
})

export const env = envSchema.parse(process.env)
```

**الاستخدام:**

```typescript
// app/api/messages/send/route.ts
import { sanitizeText } from '@/lib/sanitize'

const validatedData = sendMessageSchema.parse(body)
const sanitizedContent = sanitizeText(validatedData.content)

const message = await prisma.message.create({
  data: {
    orderId: validatedData.orderId,
    senderId: session.user.id,
    content: sanitizedContent,
  },
})
```

---

### الأسبوع 2-3: قاعدة البيانات (حرج)

#### اليوم 11-12: Database Transactions

**المهام:**
1. إضافة Transactions للعمليات المتعددة
2. إضافة Retry Logic

**الملفات المطلوب تعديلها:**
- `app/api/plans/send/route.ts`
- `app/api/payments/create/route.ts`

**الكود المطلوب:**

```typescript
// app/api/plans/send/route.ts
export async function POST(request: NextRequest) {
  try {
    // ... validation

    // Use transaction
    await prisma.$transaction(async (tx) => {
      // Deactivate all other plans
      await tx.plan.updateMany({
        where: {
          orderId: validatedData.orderId,
          id: { not: validatedData.planId },
        },
        data: { isActive: false },
      })

      // Activate the selected plan
      await tx.plan.update({
        where: { id: validatedData.planId },
        data: { isActive: true },
      })

      // Update order status
      await tx.order.update({
        where: { id: validatedData.orderId },
        data: { status: 'REVIEW' },
      })
    })

    return Response.json({
      success: true,
      message: 'تم إرسال المخطط للعميل بنجاح',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
```

---

#### اليوم 13-15: Database Migrations

**المهام:**
1. إنشاء Migrations بدلاً من `db push`
2. إضافة Indexes المفقودة

**الأوامر:**

```bash
# إنشاء migration
npx prisma migrate dev --name add_missing_indexes

# تطبيق migrations في الإنتاج
npx prisma migrate deploy
```

**تحديث Schema:**

```prisma
model Order {
  // ... existing fields
  @@index([deadline]) // إضافة
  @@index([status, createdAt]) // إضافة composite index
}

model Message {
  // ... existing fields
  @@index([createdAt]) // إضافة منفصلة
}
```

---

#### اليوم 16-17: PostgreSQL Migration

**المهام:**
1. إعداد PostgreSQL
2. نقل البيانات من SQLite
3. تحديث Connection Pooling

**الخطوات:**

1. إنشاء PostgreSQL database
2. تحديث `DATABASE_URL`
3. تحديث `schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
4. تشغيل migrations:
```bash
npx prisma migrate deploy
```

---

### الأسبوع 3-4: الأداء (متوسط)

#### اليوم 18-20: Pagination

**المهام:**
1. إضافة Pagination لجميع Lists
2. إضافة Infinite Scroll (اختياري)

**الملفات المطلوب تعديلها:**
- `app/api/orders/my-orders/route.ts`
- `app/api/messages/[orderId]/route.ts`
- `app/api/engineer/orders/route.ts`

**الكود المطلوب:**

```typescript
// app/api/orders/my-orders/route.ts
export async function GET(request: NextRequest) {
  try {
    // ... authentication

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { clientId: session.user.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          package: {
            select: {
              nameAr: true,
              price: true,
            },
          },
        },
      }),
      prisma.order.count({
        where: { clientId: session.user.id },
      }),
    ])

    return Response.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
```

---

#### اليوم 21-23: WebSockets/SSE

**المهام:**
1. استبدال Polling بـ WebSockets أو SSE
2. إضافة Real-time Updates

**الخيارات:**

**الخيار 1: Server-Sent Events (أبسط)**
```typescript
// app/api/messages/[orderId]/stream/route.ts
export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial messages
      const messages = await prisma.message.findMany({...})
      controller.enqueue(`data: ${JSON.stringify(messages)}\n\n`)

      // Poll for new messages
      const interval = setInterval(async () => {
        const newMessages = await prisma.message.findMany({...})
        controller.enqueue(`data: ${JSON.stringify(newMessages)}\n\n`)
      }, 3000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

**الخيار 2: WebSockets (أفضل للأداء)**
```typescript
// استخدام Socket.io أو native WebSockets
// يتطلب إعداد WebSocket server
```

---

#### اليوم 24-25: Caching

**المهام:**
1. إضافة Caching للبيانات الثابتة
2. إضافة React Query للـ client-side caching

**الكود المطلوب:**

```typescript
// app/api/packages/route.ts
import { unstable_cache } from 'next/cache'

export const GET = unstable_cache(
  async () => {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    })
    return Response.json({ success: true, packages })
  },
  ['packages'],
  { revalidate: 3600 } // Cache for 1 hour
)
```

---

### الأسبوع 4: معالجة الأخطاء (متوسط)

#### اليوم 26-28: Error Boundaries & Monitoring

**المهام:**
1. إضافة Error Boundaries
2. إعداد Sentry للـ Error Tracking

**الكود المطلوب:**

```typescript
// components/ErrorBoundary.tsx
'use client'

import React from 'react'
import { Button } from './shared/Button'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service
    console.error('Error caught by boundary:', error, errorInfo)
    // Sentry.captureException(error, { contexts: { react: errorInfo } })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">حدث خطأ ما</h1>
              <p className="text-gray-600 mb-4">
                نعتذر، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.
              </p>
              <Button onClick={() => window.location.reload()}>
                إعادة تحميل الصفحة
              </Button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
```

---

## 📦 التبعيات المطلوبة

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0",
    "express-rate-limit": "^7.0.0",
    "isomorphic-dompurify": "^2.0.0",
    "@sentry/nextjs": "^7.0.0"
  },
  "devDependencies": {
    "@types/express-rate-limit": "^1.0.0"
  }
}
```

---

## ✅ Checklist

### الأسبوع 1-2: الأمان
- [ ] Rate Limiting
- [ ] Security Headers
- [ ] Error Handling
- [ ] File Storage (S3)
- [ ] Input Sanitization
- [ ] Environment Validation

### الأسبوع 2-3: قاعدة البيانات
- [ ] Database Transactions
- [ ] Database Migrations
- [ ] Missing Indexes
- [ ] PostgreSQL Migration

### الأسبوع 3-4: الأداء
- [ ] Pagination
- [ ] WebSockets/SSE
- [ ] Caching

### الأسبوع 4: معالجة الأخطاء
- [ ] Error Boundaries
- [ ] Error Tracking (Sentry)

---

## 📝 ملاحظات

1. **الأولويات:** ركز على الأمان أولاً، ثم قاعدة البيانات، ثم الأداء
2. **الاختبار:** اختبر كل تحسين قبل الانتقال للآخر
3. **التوثيق:** وثق كل تغيير في COMMITS.md
4. **النسخ الاحتياطي:** احتفظ بنسخة احتياطية قبل كل تغيير كبير

---

**آخر تحديث:** 28 يناير 2026
