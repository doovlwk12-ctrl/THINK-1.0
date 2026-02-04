import { describe, it, expect } from 'vitest'
import { createOrderSchema, orderFormDataSchema } from './orderFormSchema'

const validFormData = {
  region: 'الرياض',
  city: 'الرياض',
  district: 'النخيل',
  projectType: 'سكني',
  landArea: '400',
  landLength: '20',
  landWidth: '20',
  projectCategory: 'فيلا',
}

describe('orderFormSchema', () => {
  describe('createOrderSchema', () => {
    it('accepts valid packageId and formData', () => {
      const result = createOrderSchema.safeParse({
        packageId: 'pkg-123',
        formData: validFormData,
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing packageId', () => {
      const result = createOrderSchema.safeParse({
        formData: validFormData,
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty packageId', () => {
      const result = createOrderSchema.safeParse({
        packageId: '',
        formData: validFormData,
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid formData (missing required fields)', () => {
      const result = createOrderSchema.safeParse({
        packageId: 'pkg-123',
        formData: { region: 'الرياض' },
      })
      expect(result.success).toBe(false)
    })

    it('rejects formData with invalid landArea (non-numeric)', () => {
      const result = createOrderSchema.safeParse({
        packageId: 'pkg-123',
        formData: { ...validFormData, landArea: 'abc' },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('orderFormDataSchema', () => {
    it('requires districtOther when district is أخرى', () => {
      const result = orderFormDataSchema.safeParse({
        ...validFormData,
        district: 'أخرى',
        districtOther: '',
      })
      expect(result.success).toBe(false)
    })

    it('accepts districtOther when district is أخرى', () => {
      const result = orderFormDataSchema.safeParse({
        ...validFormData,
        district: 'أخرى',
        districtOther: 'حي مخصص',
      })
      expect(result.success).toBe(true)
    })
  })
})
