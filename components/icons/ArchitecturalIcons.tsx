import React from 'react'

interface IconProps {
  className?: string
  size?: number
}

// أيقونة معلومات أساسية - مخطط معماري
export const BlueprintIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* إطار المخطط */}
    <rect x="3" y="3" width="18" height="18" rx="0" />
    {/* خطوط الشبكة */}
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
    {/* علامات القياس */}
    <line x1="3" y1="6" x2="6" y2="6" />
    <line x1="3" y1="18" x2="6" y2="18" />
    <line x1="18" y1="6" x2="21" y2="6" />
    <line x1="18" y1="18" x2="21" y2="18" />
  </svg>
)

// أيقونة نوع المشروع - مبنى
export const BuildingIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* المبنى الرئيسي */}
    <rect x="4" y="6" width="16" height="14" rx="0" />
    {/* الطوابق */}
    <line x1="4" y1="10" x2="20" y2="10" />
    <line x1="4" y1="14" x2="20" y2="14" />
    <line x1="4" y1="18" x2="20" y2="18" />
    {/* الأعمدة */}
    <line x1="8" y1="6" x2="8" y2="20" />
    <line x1="12" y1="6" x2="12" y2="20" />
    <line x1="16" y1="6" x2="16" y2="20" />
    {/* الباب */}
    <rect x="9" y="16" width="6" height="4" rx="0" />
  </svg>
)

// أيقونة تفاصيل المشروع - قلم ومخطط
export const DetailsIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* الورقة */}
    <rect x="3" y="3" width="18" height="18" rx="0" />
    {/* خطوط الكتابة */}
    <line x1="6" y1="8" x2="18" y2="8" />
    <line x1="6" y1="12" x2="18" y2="12" />
    <line x1="6" y1="16" x2="14" y2="16" />
    {/* القلم */}
    <path d="M18 4l2 2-8 8-2-2z" />
    <line x1="18" y1="4" x2="20" y2="6" />
  </svg>
)

// أيقونة الإضافات - ترس/إعدادات
export const AddonsIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* الترس الخارجي */}
    <circle cx="12" cy="12" r="8" />
    {/* الأسنان */}
    <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
    <path d="M6.34 6.34l2.83 2.83M14.83 14.83l2.83 2.83M6.34 17.66l2.83-2.83M14.83 9.17l2.83-2.83" />
    {/* المركز */}
    <circle cx="12" cy="12" r="2" />
  </svg>
)

// أيقونة المراجعة - علامة صح
export const ReviewIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* الدائرة */}
    <circle cx="12" cy="12" r="10" />
    {/* علامة الصح */}
    <path d="M8 12l2 2 4-4" />
  </svg>
)

// أيقونة سكني - فيلا
export const ResidentialIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* السقف */}
    <path d="M3 12l9-9 9 9v9H3z" />
    {/* الباب */}
    <rect x="9" y="15" width="6" height="6" rx="0" />
    {/* النوافذ */}
    <rect x="5" y="10" width="3" height="3" rx="0" />
    <rect x="16" y="10" width="3" height="3" rx="0" />
    {/* خط الأرض */}
    <line x1="3" y1="21" x2="21" y2="21" />
  </svg>
)

// أيقونة تجاري - مبنى تجاري
export const CommercialIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* المبنى */}
    <rect x="4" y="4" width="16" height="16" rx="0" />
    {/* الطوابق */}
    <line x1="4" y1="8" x2="20" y2="8" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="16" x2="20" y2="16" />
    {/* النوافذ */}
    <rect x="6" y="6" width="2" height="2" rx="0" />
    <rect x="10" y="6" width="2" height="2" rx="0" />
    <rect x="14" y="6" width="2" height="2" rx="0" />
    <rect x="16" y="6" width="2" height="2" rx="0" />
    {/* الباب */}
    <rect x="10" y="18" width="4" height="2" rx="0" />
  </svg>
)

// أيقونة خدمي - مبنى حكومي
export const ServiceIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* المبنى الرئيسي */}
    <rect x="5" y="6" width="14" height="14" rx="0" />
    {/* القبة/البرج */}
    <path d="M12 2v4M8 6h8" />
    <path d="M10 6v2M14 6v2" />
    {/* الأعمدة */}
    <line x1="7" y1="6" x2="7" y2="20" />
    <line x1="12" y1="6" x2="12" y2="20" />
    <line x1="17" y1="6" x2="17" y2="20" />
    {/* الباب */}
    <rect x="10" y="16" width="4" height="4" rx="0" />
  </svg>
)

// أيقونة سياحي - منتجع
export const TouristicIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* المبنى */}
    <rect x="4" y="8" width="16" height="12" rx="0" />
    {/* السقف المائل */}
    <path d="M4 8l8-4 8 4" />
    {/* النوافذ */}
    <rect x="6" y="12" width="3" height="3" rx="0" />
    <rect x="11" y="12" width="3" height="3" rx="0" />
    <rect x="15" y="12" width="3" height="3" rx="0" />
    {/* الباب */}
    <rect x="10" y="18" width="4" height="2" rx="0" />
    {/* الشمس */}
    <circle cx="18" cy="4" r="2" />
    <line x1="18" y1="2" x2="18" y2="1" />
    <line x1="18" y1="6" x2="18" y2="7" />
    <line x1="16" y1="4" x2="15" y2="4" />
    <line x1="20" y1="4" x2="21" y2="4" />
  </svg>
)

// أيقونات المشاكل - مستوحاة من التصميمات المرفقة

// قرارات متسرعة - نمط Blueprint احترافي
// ساعة متداخلة مع مبنى متصدع - خطوط نظيفة ورفيعة
export const HastyDecisionsIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* خلفية Blueprint خفيفة */}
    <rect width="100" height="100" fill="#F8F9FA" opacity="0.3" />
    
    {/* شبكة Blueprint */}
    <defs>
      <pattern id="grid-hasty" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#E8EDF2" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100" height="100" fill="url(#grid-hasty)" opacity="0.4" />
    
    {/* المبنى - إطار خارجي */}
    <rect x="30" y="40" width="50" height="50" fill="none" stroke="#4A4A4A" strokeWidth="2" />
    
    {/* الطوابق */}
    <line x1="30" y1="56.5" x2="80" y2="56.5" stroke="#4A4A4A" strokeWidth="1.5" />
    <line x1="30" y1="73" x2="80" y2="73" stroke="#4A4A4A" strokeWidth="1.5" />
    
    {/* النوافذ - نمط معماري */}
    {/* الطابق الأول */}
    <rect x="34" y="43" width="8" height="10" fill="none" stroke="#6B7280" strokeWidth="1.2" />
    <rect x="46" y="43" width="8" height="10" fill="none" stroke="#6B7280" strokeWidth="1.2" />
    <rect x="58" y="43" width="8" height="10" fill="none" stroke="#6B7280" strokeWidth="1.2" />
    <rect x="70" y="43" width="6" height="10" fill="none" stroke="#6B7280" strokeWidth="1.2" />
    
    {/* الطابق الثاني */}
    <rect x="34" y="59.5" width="8" height="10" fill="none" stroke="#6B7280" strokeWidth="1.2" />
    <rect x="46" y="59.5" width="8" height="10" fill="none" stroke="#6B7280" strokeWidth="1.2" />
    <rect x="58" y="59.5" width="8" height="10" fill="none" stroke="#6B7280" strokeWidth="1.2" />
    <rect x="70" y="59.5" width="6" height="10" fill="none" stroke="#6B7280" strokeWidth="1.2" />
    
    {/* الطابق الثالث */}
    <rect x="34" y="76" width="8" height="10" fill="none" stroke="#6B7280" strokeWidth="1.2" />
    <rect x="46" y="76" width="8" height="10" fill="none" stroke="#6B7280" strokeWidth="1.2" />
    <rect x="58" y="76" width="8" height="10" fill="none" stroke="#6B7280" strokeWidth="1.2" />
    
    {/* الباب */}
    <rect x="68" y="80" width="10" height="10" fill="none" stroke="#4A4A4A" strokeWidth="1.5" />
    <line x1="68" y1="85" x2="78" y2="85" stroke="#6B7280" strokeWidth="1" />
    
    {/* الشقوق - خطوط متعرجة تدل على التسرع */}
    <path d="M 37 43 L 35 52 L 37 61 L 35 70 L 37 79" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeDasharray="none" />
    <path d="M 51 43 L 49 54 L 51 65 L 49 76 L 51 87" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M 63 43 L 61 53 L 63 63 L 61 73 L 63 83" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M 75 43 L 73 52 L 75 61 L 73 70 L 75 79" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
    
    {/* خطوط القياس المعمارية */}
    <line x1="25" y1="40" x2="25" y2="90" stroke="#9CA3AF" strokeWidth="1" strokeDasharray="2,2" />
    <line x1="85" y1="40" x2="85" y2="90" stroke="#9CA3AF" strokeWidth="1" strokeDasharray="2,2" />
    
    {/* الساعة الكبيرة - في الزاوية العلوية اليسرى */}
    <circle cx="28" cy="28" r="22" fill="#FFFFFF" fillOpacity="0.9" />
    <circle cx="28" cy="28" r="22" fill="none" stroke="#4A4A4A" strokeWidth="2.5" />
    <circle cx="28" cy="28" r="18" fill="none" stroke="#6B7280" strokeWidth="1" />
    
    {/* علامات الساعة */}
    <line x1="28" y1="8" x2="28" y2="12" stroke="#4A4A4A" strokeWidth="2" />
    <line x1="46" y1="28" x2="42" y2="28" stroke="#4A4A4A" strokeWidth="2" />
    <line x1="28" y1="48" x2="28" y2="44" stroke="#4A4A4A" strokeWidth="2" />
    <line x1="10" y1="28" x2="14" y2="28" stroke="#4A4A4A" strokeWidth="2" />
    
    {/* علامات ثانوية */}
    <line x1="38.6" y1="14" x2="36.8" y2="15.8" stroke="#6B7280" strokeWidth="1.5" />
    <line x1="42" y1="22" x2="40" y2="22" stroke="#6B7280" strokeWidth="1.5" />
    <line x1="38.6" y1="42" x2="36.8" y2="40.2" stroke="#6B7280" strokeWidth="1.5" />
    <line x1="17.4" y1="42" x2="19.2" y2="40.2" stroke="#6B7280" strokeWidth="1.5" />
    <line x1="14" y1="34" x2="16" y2="34" stroke="#6B7280" strokeWidth="1.5" />
    <line x1="17.4" y1="14" x2="19.2" y2="15.8" stroke="#6B7280" strokeWidth="1.5" />
    
    {/* عقارب الساعة - 11:55 (يدل على التسرع والوقت ينفد) */}
    <line x1="28" y1="28" x2="28" y2="14" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="28" y1="28" x2="39" y2="28" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
    
    {/* النقطة المركزية */}
    <circle cx="28" cy="28" r="2" fill="#DC2626" />
    
    {/* خط اتصال بين الساعة والمبنى */}
    <line x1="48" y1="38" x2="30" y2="40" stroke="#9CA3AF" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
  </svg>
)

// مساحات مهدورة - مخطط أرضي Blueprint مع مناطق X
export const WastedSpacesIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* خلفية Blueprint */}
    <rect width="100" height="100" fill="#F8F9FA" opacity="0.3" />
    
    {/* شبكة Blueprint */}
    <defs>
      <pattern id="grid-wasted" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#E8EDF2" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100" height="100" fill="url(#grid-wasted)" opacity="0.4" />
    
    {/* إطار المخطط الأرضي */}
    <rect x="15" y="15" width="70" height="70" fill="#FFFFFF" fillOpacity="0.8" />
    <rect x="15" y="15" width="70" height="70" fill="none" stroke="#4A4A4A" strokeWidth="2.5" />
    
    {/* الجدران الداخلية - تقسيم إلى 4 غرف */}
    <line x1="50" y1="15" x2="50" y2="85" stroke="#4A4A4A" strokeWidth="2" />
    <line x1="15" y1="50" x2="85" y2="50" stroke="#4A4A4A" strokeWidth="2" />
    
    {/* الأبواب - خطوط منقطعة */}
    <line x1="45" y1="15" x2="55" y2="15" stroke="#FFFFFF" strokeWidth="3" />
    <line x1="45" y1="50" x2="55" y2="50" stroke="#FFFFFF" strokeWidth="3" />
    <line x1="50" y1="45" x2="50" y2="55" stroke="#FFFFFF" strokeWidth="3" />
    
    {/* قوس الباب */}
    <path d="M 45 15 Q 50 20 55 15" fill="none" stroke="#6B7280" strokeWidth="1" />
    <path d="M 45 50 Q 50 55 55 50" fill="none" stroke="#6B7280" strokeWidth="1" />
    <path d="M 50 45 Q 55 50 50 55" fill="none" stroke="#6B7280" strokeWidth="1" />
    
    {/* المساحات المهدورة - الزوايا مع علامة X */}
    {/* الزاوية العلوية اليسرى */}
    <g opacity="0.7">
      <line x1="18" y1="18" x2="28" y2="28" stroke="#DC2626" strokeWidth="2" strokeDasharray="4,2" />
      <line x1="28" y1="18" x2="18" y2="28" stroke="#DC2626" strokeWidth="2" strokeDasharray="4,2" />
      <rect x="16" y="16" width="14" height="14" fill="#FEE2E2" fillOpacity="0.3" />
      <text x="23" y="26" fontSize="8" fontWeight="bold" fill="#DC2626">X</text>
    </g>
    
    {/* الزاوية العلوية اليمنى */}
    <g opacity="0.7">
      <line x1="72" y1="18" x2="82" y2="28" stroke="#DC2626" strokeWidth="2" strokeDasharray="4,2" />
      <line x1="82" y1="18" x2="72" y2="28" stroke="#DC2626" strokeWidth="2" strokeDasharray="4,2" />
      <rect x="70" y="16" width="14" height="14" fill="#FEE2E2" fillOpacity="0.3" />
      <text x="77" y="26" fontSize="8" fontWeight="bold" fill="#DC2626">X</text>
    </g>
    
    {/* الزاوية السفلية اليسرى */}
    <g opacity="0.7">
      <line x1="18" y1="72" x2="28" y2="82" stroke="#DC2626" strokeWidth="2" strokeDasharray="4,2" />
      <line x1="28" y1="72" x2="18" y2="82" stroke="#DC2626" strokeWidth="2" strokeDasharray="4,2" />
      <rect x="16" y="70" width="14" height="14" fill="#FEE2E2" fillOpacity="0.3" />
      <text x="23" y="80" fontSize="8" fontWeight="bold" fill="#DC2626">X</text>
    </g>
    
    {/* الزاوية السفلية اليمنى */}
    <g opacity="0.7">
      <line x1="72" y1="72" x2="82" y2="82" stroke="#DC2626" strokeWidth="2" strokeDasharray="4,2" />
      <line x1="82" y1="72" x2="72" y2="82" stroke="#DC2626" strokeWidth="2" strokeDasharray="4,2" />
      <rect x="70" y="70" width="14" height="14" fill="#FEE2E2" fillOpacity="0.3" />
      <text x="77" y="80" fontSize="8" fontWeight="bold" fill="#DC2626">X</text>
    </g>
    
    {/* خطوط القياس */}
    <g stroke="#9CA3AF" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.6">
      <line x1="10" y1="15" x2="10" y2="85" />
      <line x1="90" y1="15" x2="90" y2="85" />
      <line x1="15" y1="10" x2="85" y2="10" />
      <line x1="15" y1="90" x2="85" y2="90" />
    </g>
    
    {/* أسهم القياس */}
    <g stroke="#6B7280" strokeWidth="1" fill="#6B7280">
      <line x1="10" y1="20" x2="10" y2="15" />
      <polygon points="10,15 8,18 12,18" />
      <line x1="10" y1="80" x2="10" y2="85" />
      <polygon points="10,85 8,82 12,82" />
    </g>
  </svg>
)

// توزيع غير مناسب - مخطط أرضي Blueprint مع توزيع سيء
export const UnsuitableLayoutIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* خلفية Blueprint */}
    <rect width="100" height="100" fill="#F8F9FA" opacity="0.3" />
    
    {/* شبكة Blueprint */}
    <defs>
      <pattern id="grid-unsuitable" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#E8EDF2" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100" height="100" fill="url(#grid-unsuitable)" opacity="0.4" />
    
    {/* إطار المخطط */}
    <rect x="15" y="15" width="70" height="70" fill="#FFFFFF" fillOpacity="0.8" />
    <rect x="15" y="15" width="70" height="70" fill="none" stroke="#4A4A4A" strokeWidth="2.5" />
    
    {/* الجدران الداخلية - توزيع سيء */}
    <line x1="45" y1="15" x2="45" y2="85" stroke="#4A4A4A" strokeWidth="2" />
    <line x1="15" y1="40" x2="85" y2="40" stroke="#4A4A4A" strokeWidth="2" />
    <line x1="15" y1="65" x2="45" y2="65" stroke="#4A4A4A" strokeWidth="2" />
    <line x1="60" y1="40" x2="60" y2="85" stroke="#4A4A4A" strokeWidth="2" />
    
    {/* الأثاث - غرفة 1 (سرير كبير يسد المساحة) */}
    <rect x="18" y="18" width="24" height="18" fill="#D1D5DB" fillOpacity="0.4" stroke="#6B7280" strokeWidth="1.5" />
    <line x1="18" y1="27" x2="42" y2="27" stroke="#9CA3AF" strokeWidth="1" />
    <text x="30" y="30" fontSize="6" textAnchor="middle" fill="#6B7280">سرير</text>
    
    {/* غرفة 2 - طاولة تسد المدخل */}
    <rect x="48" y="18" width="18" height="18" fill="#D1D5DB" fillOpacity="0.4" stroke="#6B7280" strokeWidth="1.5" />
    <line x1="52" y1="22" x2="62" y2="32" stroke="#9CA3AF" strokeWidth="1" />
    <line x1="62" y1="22" x2="52" y2="32" stroke="#9CA3AF" strokeWidth="1" />
    <text x="57" y="29" fontSize="6" textAnchor="middle" fill="#6B7280">طاولة</text>
    
    {/* الممر الضيق المزدحم - المشكلة الرئيسية */}
    <rect x="45" y="43" width="15" height="19" fill="#FEE2E2" fillOpacity="0.5" />
    <line x1="46" y1="45" x2="59" y2="60" stroke="#DC2626" strokeWidth="2.5" />
    <line x1="59" y1="45" x2="46" y2="60" stroke="#DC2626" strokeWidth="2.5" />
    <text x="52.5" y="55" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#DC2626">X</text>
    
    {/* حمام - في موقع غير مناسب */}
    <circle cx="70" cy="52" r="6" fill="none" stroke="#6B7280" strokeWidth="1.5" />
    <circle cx="70" cy="52" r="3" fill="#D1D5DB" fillOpacity="0.3" />
    <text x="70" y="54" fontSize="5" textAnchor="middle" fill="#6B7280">WC</text>
    
    {/* غرفة 3 - خزانة تسد النافذة */}
    <rect x="18" y="68" width="24" height="14" fill="#D1D5DB" fillOpacity="0.4" stroke="#6B7280" strokeWidth="1.5" />
    <line x1="22" y1="68" x2="22" y2="82" stroke="#9CA3AF" strokeWidth="1" />
    <line x1="27" y1="68" x2="27" y2="82" stroke="#9CA3AF" strokeWidth="1" />
    <line x1="32" y1="68" x2="32" y2="82" stroke="#9CA3AF" strokeWidth="1" />
    <line x1="37" y1="68" x2="37" y2="82" stroke="#9CA3AF" strokeWidth="1" />
    
    {/* مطبخ صغير */}
    <rect x="63" y="68" width="19" height="14" fill="#D1D5DB" fillOpacity="0.3" stroke="#6B7280" strokeWidth="1.5" />
    <rect x="65" y="70" width="6" height="4" fill="none" stroke="#9CA3AF" strokeWidth="1" />
    <rect x="65" y="76" width="6" height="4" fill="none" stroke="#9CA3AF" strokeWidth="1" />
    
    {/* الأبواب - توزيع سيء */}
    {/* باب يفتح على حائط */}
    <line x1="43" y1="15" x2="43" y2="20" stroke="#DC2626" strokeWidth="2" strokeDasharray="2,2" />
    <path d="M 43 15 Q 38 18 43 20" fill="none" stroke="#DC2626" strokeWidth="1.5" />
    <circle cx="41" cy="17.5" r="3" fill="none" stroke="#DC2626" strokeWidth="1" strokeDasharray="1,1" />
    
    {/* خطوط تدفق الحركة - متقاطعة ومزدحمة */}
    <g stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6">
      <path d="M 30 36 L 30 43 L 52 43" />
      <path d="M 52 43 L 52 60" />
      <path d="M 52 60 L 30 75" />
    </g>
    
    {/* علامات تحذير */}
    <g fill="#DC2626" opacity="0.8">
      <circle cx="38" cy="17" r="2" />
      <circle cx="52" cy="52" r="2" />
    </g>
    
    {/* خطوط القياس */}
    <g stroke="#9CA3AF" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5">
      <line x1="10" y1="40" x2="15" y2="40" />
      <line x1="85" y1="40" x2="90" y2="40" />
    </g>
  </svg>
)
