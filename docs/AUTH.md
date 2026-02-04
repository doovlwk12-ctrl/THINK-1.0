# المصادقة والصلاحيات — منصة فكرة  
# Authentication and Authorization

## نظرة عامة

المشروع يدعم مصادقة عبر **NextAuth** (Credentials) أو **Supabase Auth**. التبديل عبر المتغير `NEXT_PUBLIC_USE_SUPABASE_AUTH`.

- **المصادقة (Authn):** التحقق من هوية المستخدم (تسجيل الدخول، الجلسة).
- **الصلاحيات (Authz):** التحقق من دور المستخدم (عميل، مهندس، أدمن) قبل السماح بمسارات أو عمليات معينة.

## الأدوار

| الدور   | الوصف        | المسارات الرئيسية              |
|--------|---------------|---------------------------------|
| CLIENT | عميل          | `/dashboard`, `/orders/*`      |
| ENGINEER | مهندس       | `/engineer/dashboard`, `/engineer/orders/*` |
| ADMIN  | مسؤول النظام  | `/admin/*`                      |

## قواعد قاعدة البيانات (Prisma)

المخطط في [prisma/schema.prisma](../prisma/schema.prisma) يفرض: تفرد البريد والجوال في `User`، وعلاقات `Order` و`Message` و`Plan` مع `onDelete` مناسب. التطبيق يتحقق قبل الإنشاء/التحديث (التسجيل والملف الشخصي يتحققان من عدم تكرار البريد/الجوال؛ إنشاء الطلب يربط `clientId` و`packageId` بسجلات موجودة). تشغيل `npx prisma validate` للتحقق من صحة المخطط.

## المسارات العامة (بدون تسجيل دخول)

لا تتطلب مصادقة:

- **الصفحات:** `/`, `/login`, `/register`, `/forgot-password`, `/forgot-email`, `/reset-password`, `/engineer/apply/[token]`
- **API:** `/api/auth/register`, `/api/auth/forgot-email`, `/api/packages`, `/api/content/homepage`, `/api/engineer/applications/*`

القائمة المعتمدة في الكود: [lib/routes.ts](../lib/routes.ts).

## المسارات المحمية حسب الدور

- **أدمن فقط:** كل ما تحت `/admin/*` و `/api/admin/*` — يستخدم `requireAdmin(request)`.
- **مهندس أو أدمن:** `/engineer/*` (ما عدا `/engineer/apply/`) و `/api/engineer/*` ومسارات رفع/إرسال المخططات — يستخدم `requireEngineerOrAdmin(request)`.
- **عميل فقط:** إنشاء الطلب (`POST /api/orders/create`)، إنهاء الطلب، شراء تمديد، شراء تعديلات، إنشاء طلب تعديل — يستخدم `requireClient(request)`.
- **أي مستخدم مسجل:** لوحة المستخدم، الطلبات، المحادثات، الإشعارات، الملف الشخصي — يستخدم `requireAuth(request)`.

## استخدام المصادقة في الـ API

- استنتاج المستخدم الحالي: استخدم **getApiAuth(request)** (من `@/lib/getApiAuth`) أو الدوال الموحدة من **@/lib/requireAuth**.
- لا تستخدم **getServerSession** مباشرة في المسارات المحمية؛ الاعتماد على **getApiAuth** أو **requireAuth** لضمان عمل NextAuth و Supabase معاً.

الدوال الموحدة المفضلة في المسارات:

- `requireAuth(request)` — يُرجع `{ auth }` أو 401.
- `requireRole(request, ['ADMIN'])` — يُرجع `{ auth }` أو 401/403.
- `requireAdmin(request)` — اختصار لصلاحية الأدمن.
- `requireEngineerOrAdmin(request)` — اختصار لصلاحية المهندس أو الأدمن.
- `requireClient(request)` — اختصار لصلاحية العميل.

مثال:

```ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'

export async function GET(request: NextRequest) {
  const result = await requireAdmin(request)
  if (result instanceof NextResponse) return result
  const { auth } = result
  // استخدام auth.userId و auth.role
}
```

## الـ Middleware

- عند **Supabase** (`NEXT_PUBLIC_USE_SUPABASE_AUTH=true`): الـ middleware يقرأ جلسة Supabase من الكوكيز؛ إن وُجد مستخدم يُسمح بالطلب، وإلا يُوجّه إلى `/login` للمسارات المحمية. قائمة المسارات العامة من [lib/routes.ts](../lib/routes.ts).
- عند **NextAuth**: استخدام `withAuth` مع التحقق من الدور (أدمن، مهندس) وإعادة التوجيه حسب المسار.

## تدفق ما بعد تسجيل الدخول (حسب الدور)

- **عميل (CLIENT):** بعد تسجيل الدخول يُوجّه إلى `/dashboard`. الهيدر يعرض قائمة المستخدم ولوحة التحكم. الطلبات من `/api/orders/my-orders`؛ إنشاء طلب من `POST /api/orders/create` (صلاحية عميل فقط). الصفحات تحت `/dashboard` و `/orders/*` تعتمد على `requireAuth` أو `requireClient` في الـ API.
- **مهندس (ENGINEER):** يُوجّه إلى `/engineer/dashboard`. المسارات تحت `/engineer/*` و `/api/engineer/*` محمية بـ `requireEngineerOrAdmin`. يمكنه عرض الطلبات المعيّنة له وبدء الطلب والرسائل ورفع المخططات.
- **أدمن (ADMIN):** يُوجّه إلى `/admin/dashboard`. المسارات تحت `/admin/*` و `/api/admin/*` محمية بـ `requireAdmin`. يمكنه الإحصائيات وإدارة المهندسين والطلبات والباقات والإعدادات والمحتوى.

يجب أن تعتمد الصفحات المحمية على `status === 'authenticated'` (من `useAuth`) وعدم إظهار محتوى حساس قبل التحقق؛ الـ API يطبّق التحقق عبر `requireAuth` / `requireRole`.

## تدفق Supabase (تسجيل الدخول والأدوار)

1. المستخدم يسجّل الدخول من الواجهة → Supabase Auth يصدّر الجلسة ويخزّنها في الكوكيز.
2. الـ middleware يقرأ الجلسة من الطلب ويسمح أو يوجّه إلى `/login`.
3. مسارات الـ API تستدعي **getApiAuth(request)** أو **requireAuth** / **requireAdmin** إلخ؛ يتم قراءة المستخدم من Supabase ثم التحقق من جدول User في Prisma للحصول على الدور.
4. إضافة مستخدم تجريبي: من Supabase Dashboard → Authentication → Users → Add user. تعيين دور مهندس/أدمن: بعد أول تسجيل دخول، تشغيل `npx tsx scripts/set-user-role.ts <البريد> ENGINEER` أو `ADMIN`.

**تغيير كلمة المرور (مستخدمو Supabase):** عند استخدام Supabase، تغيير كلمة المرور من صفحة الملف الشخصي يحدّث Supabase عبر المفتاح الخدمي (`SUPABASE_SERVICE_ROLE_KEY`). إن لم يُضبط هذا المتغير، يُعاد رسالة توضّح أن تغيير كلمة المرور غير متاح لمستخدمي Supabase.

**نسيت كلمة المرور (Supabase):** عند تفعيل Supabase، صفحة "نسيت كلمة المرور" ترسل رابط إعادة التعيين عبر البريد (`resetPasswordForEmail`). المستخدم يفتح الرابط ويُوجّه إلى `/reset-password` لتعيين كلمة مرور جديدة. يجب إضافة عنوان الصفحة إلى قائمة "Redirect URLs" في Supabase: Authentication → URL Configuration → Redirect URLs (مثال: `https://your-domain.com/reset-password`).

لمزيد من التفاصيل: [SUPABASE-AFTER-SETUP.md](SUPABASE-AFTER-SETUP.md).

## تحليل سير العمل الكامل

لتحليل مفصل لسير العمل قبل التسجيل وأثناءه وبعده (إنشاء حساب، تسجيل دخول، تسجيل خروج، توجيه كل دور)، راجع [AUTH-WORKFLOW.md](AUTH-WORKFLOW.md).

لخطة إصلاح وتحسين المصادقة (ما تم تنفيذه والبنود الاختيارية)، راجع [AUTH-IMPROVEMENTS-PLAN.md](AUTH-IMPROVEMENTS-PLAN.md).
