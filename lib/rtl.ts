/**
 * مكتبة مساعدة لدعم RTL (Right-to-Left)
 */

/**
 * التحقق من أن الاتجاه الحالي هو RTL
 */
export const isRTL = (): boolean => {
  if (typeof document !== 'undefined') {
    return document.dir === 'rtl' || document.documentElement.dir === 'rtl'
  }
  return true // default for Arabic
}

/**
 * الحصول على الكلاس المناسب بناءً على الاتجاه
 */
export const getDirectionalClass = (ltrClass: string, rtlClass: string): string => {
  return isRTL() ? rtlClass : ltrClass
}

/**
 * عكس القيمة الرقمية للاتجاه RTL (مفيد للـ margins و paddings)
 */
export const flipValue = (value: number): number => {
  return isRTL() ? -value : value
}

/**
 * الحصول على خاصية margin أو padding المناسبة
 */
export const getDirectionalSpacing = (
  side: 'left' | 'right',
  value: string
): { [key: string]: string } => {
  const isLeft = side === 'left'
  const actualSide = isRTL() ? (isLeft ? 'right' : 'left') : side
  
  return {
    [`margin-${actualSide}`]: value,
  }
}

/**
 * الحصول على اتجاه الأيقونة (للأسهم)
 */
export const getArrowDirection = (direction: 'forward' | 'back'): 'left' | 'right' => {
  if (direction === 'forward') {
    return isRTL() ? 'left' : 'right'
  }
  return isRTL() ? 'right' : 'left'
}
