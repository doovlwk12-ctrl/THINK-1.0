# نطاق انتقال منصة فكرة إلى Firebase

**تاريخ الإنشاء:** 2025-01-29  
**المرجع:** خطة تنفيذ الانتقال إلى Firebase (المرحلة 0)

---

## 1. جدول مسارات API

| المسار (Path) | Method | الوظيفة |
|---------------|--------|---------|
| `/api/auth/[...nextauth]` | * | NextAuth (تسجيل دخول، جلسة، خروج) |
| `/api/auth/register` | POST | تسجيل مستخدم جديد (عميل) |
| `/api/users/profile` | GET | جلب بروفايل المستخدم الحالي |
| `/api/users/profile` | PUT | تحديث بروفايل المستخدم |
| `/api/packages` | GET | قائمة الباقات النشطة |
| `/api/orders/create` | POST | إنشاء طلب جديد |
| `/api/orders/my-orders` | GET | طلبات العميل الحالي |
| `/api/orders/[id]` | GET | تفاصيل طلب |
| `/api/orders/[id]` | PUT | تحديث طلب (حالة، أرشفة، إلخ) |
| `/api/orders/[id]/package` | GET | باقة الطلب |
| `/api/orders/[id]/plans` | GET | مخططات الطلب |
| `/api/orders/[id]/buy-extension` | POST | شراء تمديد (يوم + تعديل) |
| `/api/orders/[id]/buy-revisions` | POST | شراء تعديلات إضافية |
| `/api/orders/[id]/complete` | POST | تأكيد إكمال الطلب |
| `/api/orders/[id]/payment` | GET | معلومات الدفع للطلب |
| `/api/messages/send` | POST | إرسال رسالة في طلب |
| `/api/messages/[orderId]` | GET | رسائل الطلب |
| `/api/plans/upload` | POST | رفع مخطط (ملف) |
| `/api/plans/send` | POST | إرسال مخطط للعميل |
| `/api/plans/[planId]` | GET | تفاصيل مخطط |
| `/api/plans/[planId]` | DELETE | حذف مخطط |
| `/api/revisions/create` | POST | إنشاء طلب تعديل (دبابيس) |
| `/api/revisions/[orderId]` | GET | طلبات التعديل للطلب |
| `/api/revisions/detail/[revisionId]` | GET | تفاصيل طلب تعديل |
| `/api/payments/create` | POST | إنشاء دفع (محاكي) |
| `/api/notifications` | GET | إشعارات المستخدم |
| `/api/notifications/subscribe` | POST | الاشتراك في الإشعارات |
| `/api/admin/stats` | GET | إحصائيات لوحة الإدارة |
| `/api/admin/orders` | GET | كل الطلبات (إدارة) |
| `/api/admin/packages` | GET | قائمة الباقات |
| `/api/admin/packages` | POST | إنشاء باقة |
| `/api/admin/packages/[id]` | GET | تفاصيل باقة |
| `/api/admin/packages/[id]` | PUT | تحديث باقة |
| `/api/admin/packages/[id]` | DELETE | حذف باقة |
| `/api/admin/users` | GET | قائمة المستخدمين |
| `/api/admin/engineers/applications` | GET | طلبات انضمام المهندسين |
| `/api/admin/engineers/applications/[id]/approve` | POST | الموافقة على طلب انضمام |
| `/api/admin/engineers/applications/[id]/reject` | POST | رفض طلب انضمام |
| `/api/admin/engineers/invite` | POST | دعوة مهندس (مستقبلي) |
| `/api/engineer/orders` | GET | طلبات المهندس (معينة وغير معينة) |
| `/api/engineer/orders/[id]` | GET | تفاصيل طلب للمهندس |
| `/api/engineer/orders/[id]/start` | POST | بدء العمل على طلب |
| `/api/engineer/orders/[id]/extend` | POST | تمديد الموعد (مهندس) |
| `/api/engineer/orders/[id]/status` | GET | حالة الطلب |
| `/api/engineer/applications/[token]` | GET | جلب طلب انضمام بالتوكن |
| `/api/engineer/applications/[token]` | POST | تقديم طلب انضمام |
| `/api/whatsapp/plan-uploaded` | GET | رابط واتساب بعد رفع مخطط |

---

## 2. تدفقات Must-Work لكل دور

### عميل (CLIENT)

- تسجيل الدخول (NextAuth أو Firebase Auth لاحقاً).
- التسجيل كعميل جديد (`/api/auth/register`).
- عرض وتحديث البروفايل (`/api/users/profile` GET/PUT).
- اختيار باقة وعرض الباقات (`/api/packages`).
- إنشاء طلب (`/api/orders/create`).
- عرض طلباتي (`/api/orders/my-orders`).
- عرض تفاصيل طلب، باقة، مخططات، دفع (`/api/orders/[id]`, package, plans, payment).
- شراء تمديد وتعديلات إضافية (`/api/orders/[id]/buy-extension`, buy-revisions).
- تأكيد إكمال الطلب (`/api/orders/[id]/complete`).
- إرسال واستقبال رسائل الطلب (`/api/messages/send`, `/api/messages/[orderId]`).
- إنشاء طلب تعديل (`/api/revisions/create`).
- عرض إشعارات (`/api/notifications`).

### مهندس (ENGINEER)

- تسجيل الدخول.
- عرض طلبات المهندس (`/api/engineer/orders`).
- بدء طلب (`/api/engineer/orders/[id]/start`).
- رفع مخطط (`/api/plans/upload`).
- إرسال مخطط للعميل (`/api/plans/send`).
- حذف/عرض مخطط (`/api/plans/[planId]`).
- تمديد الموعد (`/api/engineer/orders/[id]/extend`).
- المحادثة ورسائل الطلب.
- عرض ومعالجة طلبات التعديل (`/api/revisions/[orderId]`, detail).
- تقديم طلب انضمام عبر الرابط (`/api/engineer/applications/[token]`).

### إدارة (ADMIN)

- تسجيل الدخول.
- عرض الإحصائيات (`/api/admin/stats`).
- إدارة الطلبات (`/api/admin/orders`).
- إدارة الباقات CRUD (`/api/admin/packages`, `[id]`).
- إدارة المستخدمين (`/api/admin/users`).
- الموافقة/الرفض على طلبات انضمام المهندسين (`/api/admin/engineers/applications/[id]/approve`, reject).
- عرض طلبات الانضمام (`/api/admin/engineers/applications`).

---

## 3. الاعتماديات

- **المصادقة:** تعتمد على Prisma User (CredentialsProvider في lib/auth.ts). بعد النقل: Firebase Auth + Firestore/Custom Claims للأدوار.
- **كل API:** يستخدم `getServerSession(authOptions)` و `prisma` من lib. بعد النقل: التحقق من ID Token وقراءة/كتابة Firestore و Storage.
- **رفع الملفات:** lib/storage.ts (محلي أو S3/Cloudinary). بعد النقل: Firebase Storage.
- **Middleware:** withAuth من NextAuth و token.role. بعد النقل: التحقق من Firebase Auth (أو session cookie).

---

## 4. الملفات المرجعية

- مسارات API: `app/api/**/route.ts`
- المصادقة: `lib/auth.ts`
- حماية المسارات: `middleware.ts`
- التخزين: `lib/storage.ts`
- قاعدة البيانات: `prisma/schema.prisma`
