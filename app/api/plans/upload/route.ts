import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { uploadFile, deleteFileByUrl, STORAGE_NOT_CONFIGURED_MESSAGE } from '@/lib/storage'
import {
  uploadEngineerFileToOrders,
  isSupabaseStorageConfigured,
} from '@/lib/uploadEngineerFile'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024   // 10MB لكل ملف عند الرفع
const MAX_FILE_SIZE_AFTER_SAVE_BYTES = 5 * 1024 * 1024  // 5MB حد أقصى بعد الحفظ

export async function POST(request: NextRequest) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    if (auth.role !== 'ENGINEER' && auth.role !== 'ADMIN') {
      return Response.json(
        {
          error: 'دور غير كافٍ - يلزم أن تكون مهندساً أو مسؤولاً لرفع المخططات',
          errorCode: 'INSUFFICIENT_ROLE',
        },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const orderId = formData.get('orderId') as string

    if (!file || !orderId) {
      return Response.json(
        { error: 'بيانات غير مكتملة' },
        { status: 400 }
      )
    }

    // جلب الطلب مع بيانات المهندس المعيّن (للمطابقة بالبريد عند اختلاف userId)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        engineer: { select: { id: true, email: true } },
      },
    })

    if (!order) {
      return Response.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // المهندس: إما معيّن على الطلب، أو الطلب غير معيّن (نُعيِّنه)، أو نفس الشخص بآيدي مختلف (مطابقة بالبريد)
    if (auth.role === 'ENGINEER') {
      if (order.engineerId === null) {
        await prisma.order.update({
          where: { id: orderId },
          data: { engineerId: auth.userId },
        })
      } else if (order.engineerId !== auth.userId) {
        // احتمال ازدواج سجلات: نفس الشخص بآيدي مختلف (مثلاً بعد Supabase). نتحقق بالبريد.
        const currentUser = await prisma.user.findUnique({
          where: { id: auth.userId },
          select: { email: true },
        })
        const samePersonByEmail =
          currentUser?.email && order.engineer?.email && currentUser.email === order.engineer.email
        if (samePersonByEmail) {
          await prisma.order.update({
            where: { id: orderId },
            data: { engineerId: auth.userId },
          })
        } else {
          return Response.json(
            {
              error: 'غير مصرح - المهندس غير معيّن على هذا الطلب',
              errorCode: 'ENGINEER_NOT_ASSIGNED',
            },
            { status: 403 }
          )
        }
      }
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return Response.json(
        { error: 'نوع الملف غير مدعوم. يرجى رفع صورة (JPG, PNG) أو ملف PDF' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB per file)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json(
        { error: 'حجم الملف كبير جداً. الحد الأقصى 10MB لكل ملف. يُنصح بتقليل حجم الملف (ضغط الصورة أو PDF أصغر) قبل الرفع.' },
        { status: 400 }
      )
    }

    // رفع الملف: إن وُجد Supabase Storage نرفع إلى bucket "orders" ونسجل في file_expiry_tracker
    let uploadResult: { url: string; fileName: string; fileSize: number }
    if (isSupabaseStorageConfigured()) {
      const result = await uploadEngineerFileToOrders(file, {
        folder: 'plans',
        maxSizeBytes: MAX_FILE_SIZE_BYTES,
      })
      uploadResult = { url: result.url, fileName: result.fileName, fileSize: result.fileSize }
    } else {
      uploadResult = await uploadFile(file, {
        folder: 'plans',
        maxSize: MAX_FILE_SIZE_BYTES,
        allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
      })
    }

    // حد الحجم بعد الحفظ: إذا تجاوز الملف المحفوظ 5MB نرفض ونحذف الملف (ومع Supabase نزيل سجل التتبع)
    if (uploadResult.fileSize > MAX_FILE_SIZE_AFTER_SAVE_BYTES) {
      await deleteFileByUrl(uploadResult.url)
      if (isSupabaseStorageConfigured()) {
        const pathMatch = uploadResult.url.match(/\/object\/public\/[^/]+\/(.+)$/)
        if (pathMatch?.[1]) {
          await prisma.fileExpiryTracker.deleteMany({ where: { filePath: pathMatch[1] } })
        }
      }
      return Response.json(
        {
          error: `حجم الملف بعد الحفظ كبير (${(uploadResult.fileSize / (1024 * 1024)).toFixed(1)}MB). الحد الأقصى بعد الحفظ 5MB. يُرجى تقليل حجم الملف (ضغط الصورة أو استخدام PDF أصغر) ثم إعادة الرفع.`,
        },
        { status: 413 }
      )
    }

    // Determine file type
    const fileType = file.type.startsWith('image/') ? 'image' : 'pdf'

    // Create new plan (isActive: false until sent via /api/plans/send; do not deactivate other plans here so multiple can be uploaded then sent in one batch)
    const plan = await prisma.plan.create({
      data: {
        orderId,
        fileUrl: uploadResult.url,
        fileType,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        isActive: false, // Set to false initially, will be activated when sent
      }
    })

    return Response.json({
      success: true,
      plan
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === STORAGE_NOT_CONFIGURED_MESSAGE) {
      return Response.json(
        {
          error:
            'رفع الملفات غير متوفر على الخادم الحالي. يرجى إعداد التخزين السحابي (S3 أو Cloudinary) في متغيرات البيئة.',
        },
        { status: 503 }
      )
    }
    return handleApiError(error)
  }
}
