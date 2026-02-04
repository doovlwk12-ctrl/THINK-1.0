import { z } from 'zod'

/** Allowed value types for form data fields (client sends strings, string[], numbers, booleans). */
const formDataValueSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.number(),
  z.boolean(),
])

/**
 * Strict schema for order creation formData.
 * Required fields align with CreateOrderContent validateStep1/validateStep2.
 * Additional keys (res_*, com_*, srv_*, tour_*, etc.) are allowed as formDataValueSchema.
 */
export const orderFormDataSchema = z
  .object({
    region: z.string().min(1, 'المنطقة مطلوبة'),
    city: z.string().min(1, 'المدينة مطلوبة'),
    district: z.string().min(1, 'الحي مطلوب'),
    districtOther: z.string().optional(),
    projectType: z.string().min(1, 'نوع المشروع مطلوب'),
    landArea: z.string().min(1, 'مساحة الأرض مطلوبة').regex(/^\d+$/, 'يجب أن يكون رقماً صحيحاً'),
    landLength: z.string().min(1, 'الطول مطلوب').regex(/^\d+$/, 'يجب أن يكون رقماً صحيحاً'),
    landWidth: z.string().min(1, 'العرض مطلوب').regex(/^\d+$/, 'يجب أن يكون رقماً صحيحاً'),
    landDepth: z.string().optional(),
    landAreaOverride: z.boolean().optional(),
    dimensionsConfirmed: z.boolean().optional(),
    facadeCount: z.string().optional(),
    facadeDirection: z.string().optional(),
    floorsCount: z.string().optional(),
    projectCategory: z.string().min(1, 'نوع المشروع (الفئة) مطلوب'),
    selectedAddons: z.array(z.string()).optional(),
    addonsNotes: z.string().optional(),
  })
  .passthrough()
  .refine(
    (data) => {
      // If district is "أخرى", districtOther must be non-empty
      if (data.district === 'أخرى') {
        const other = (data.districtOther ?? '').trim()
        return other.length > 0
      }
      return true
    },
    { message: 'يرجى كتابة الحي عند اختيار أخرى', path: ['districtOther'] }
  )

export type OrderFormData = z.infer<typeof orderFormDataSchema>

/** Schema for the full create order request body (API). */
export const createOrderSchema = z.object({
  packageId: z.string().min(1, 'معرف الباقة مطلوب'),
  formData: orderFormDataSchema,
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
