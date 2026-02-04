'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { 
  X, 
  Send, 
  ZoomIn, 
  ZoomOut, 
  Move, 
  RotateCcw,
  Edit2,
  Crosshair,
  Lock,
  Unlock
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import { isOrderExpired } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Plan {
  id: string
  fileUrl: string | null
  fileType: string
  fileName?: string | null
}

interface Pin {
  id: string
  x: number
  y: number
  color: string
  note: string
}

const MAX_PINS = 6
const MAX_PIN_GROUPS = 6 // Must match API (buy-pin-pack route)
const COLORS_PER_GROUP = 6
const REVISION_STATE_KEY = 'revision-page-state'

// كل مجموعة لها 6 ألوان خاصة بها (لا تتكرر مع المجموعات الأخرى)
const ALL_PIN_COLORS: Array<{ value: string; label: string }> = [
  { value: '#ef4444', label: 'أحمر' },
  { value: '#3b82f6', label: 'أزرق' },
  { value: '#10b981', label: 'أخضر' },
  { value: '#f59e0b', label: 'أصفر' },
  { value: '#8b5cf6', label: 'بنفسجي' },
  { value: '#ec4899', label: 'وردي' },
  { value: '#06b6d4', label: 'سماوي' },
  { value: '#84cc16', label: 'ليموني' },
  { value: '#f97316', label: 'برتقالي' },
  { value: '#a855f7', label: 'بنفسجي فاتح' },
  { value: '#e11d48', label: 'قرمزي' },
  { value: '#0d9488', label: 'تركواز' },
  { value: '#ca8a04', label: 'كهرماني' },
  { value: '#dc2626', label: 'أحمر غامق' },
  { value: '#2563eb', label: 'أزرق غامق' },
  { value: '#059669', label: 'أخضر غامق' },
  { value: '#c026d3', label: 'ماجنتا' },
  { value: '#4f46e5', label: 'نيلي' },
  { value: '#0ea5e9', label: 'أزرق فاتح' },
  { value: '#22c55e', label: 'أخضر فاتح' },
  { value: '#eab308', label: 'ذهبي' },
  { value: '#fb923c', label: 'برتقالي فاتح' },
  { value: '#c084fc', label: 'بنفسجي باهت' },
  { value: '#f43f5e', label: 'وردي غامق' },
  { value: '#14b8a6', label: 'تيل' },
  { value: '#65a30d', label: 'زيتوني' },
  { value: '#ea580c', label: 'برتقالي محروق' },
  { value: '#7c3aed', label: 'بنفسجي فيوليت' },
  { value: '#be123c', label: 'عنابي' },
  { value: '#0369a1', label: 'أزرق سماوي غامق' },
  { value: '#15803d', label: 'أخضر غابة' },
  { value: '#a16207', label: 'بني ذهبي' },
  { value: '#9333ea', label: 'بنفسجي داكن' },
  { value: '#db2777', label: 'وردي داكن' },
  { value: '#0891b2', label: 'سماوي غامق' },
  { value: '#4d7c0f', label: 'أخضر زيتي' },
]

/** ألوان المجموعة فقط (كل مجموعة لها ألوانها الجديدة عن السابقة) */
function getColorsForGroup(groupIndex: number): Array<{ value: string; label: string }> {
  const start = (groupIndex % Math.ceil(ALL_PIN_COLORS.length / COLORS_PER_GROUP)) * COLORS_PER_GROUP
  return ALL_PIN_COLORS.slice(start, start + COLORS_PER_GROUP)
}

// للتوافق مع الاستخدام السابق: المجموعة 0
const PIN_COLORS = getColorsForGroup(0)

interface PinGroup {
  id: string
  pins: Pin[]
}

interface PinPackSettings {
  pinPackPrice: number
  pinPackOldPrice: number | null
  pinPackDiscountPercent: number | null
  messageWhen1Left: string | null
  messageWhen0Left: string | null
}

export default function RevisionPage() {
  const params = useParams()
  const router = useRouter()
  const { status } = useAuth()
  const orderId = params.id as string

  const [allPlans, setAllPlans] = useState<Plan[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [pinsByPlan, setPinsByPlan] = useState<Record<string, PinGroup[]>>({})
  const [activeGroupIndex, setActiveGroupIndex] = useState(0)
  const [pinGroupsCount, setPinGroupsCount] = useState(1)
  const [pinPackSettings, setPinPackSettings] = useState<PinPackSettings | null>(null)

  /** Returns PinGroup[] for the plan, or creates empty groups if not present. */
  const getOrCreateGroupsForPlan = useCallback(
    (planId: string): PinGroup[] =>
      pinsByPlan[planId] ?? Array.from({ length: pinGroupsCount }, (_, i) => ({ id: `group-${i}`, pins: [] })),
    [pinsByPlan, pinGroupsCount]
  )

  /** Updates pins for a given plan and group index. */
  const setPinsForPlanAndGroup = useCallback(
    (planId: string, groupIndex: number, updater: (prev: Pin[]) => Pin[]) => {
      setPinsByPlan((prev) => {
        const groups = prev[planId] ?? Array.from({ length: pinGroupsCount }, (_, i) => ({ id: `group-${i}`, pins: [] }))
        if (groupIndex < 0 || groupIndex >= groups.length) return prev
        const next = [...groups]
        next[groupIndex] = { ...next[groupIndex], pins: updater(next[groupIndex].pins) }
        return { ...prev, [planId]: next }
      })
    },
    [pinGroupsCount]
  )

  const setActiveGroupPins = useCallback(
    (updater: (prev: Pin[]) => Pin[]) => {
      if (!plan) return
      setPinsForPlanAndGroup(plan.id, activeGroupIndex, updater)
    },
    [plan, activeGroupIndex, setPinsForPlanAndGroup]
  )

  /** Total pin count across all groups for a plan (for tab label). */
  const getPlanPinsCount = useCallback(
    (planId: string): number =>
      (pinsByPlan[planId] ?? []).reduce((sum, g) => sum + (g.pins?.length ?? 0), 0),
    [pinsByPlan]
  )

  /** Total pins used in this group across ALL plans (shared pool). */
  const totalPinsUsedInActiveGroup = useMemo(
    () =>
      allPlans.reduce(
        (sum, p) => sum + (pinsByPlan[p.id]?.[activeGroupIndex]?.pins?.length ?? 0),
        0
      ),
    [pinsByPlan, activeGroupIndex, allPlans]
  )

  /** كل الدبابيس على المخطط الحالي من كل المجموعات (لا تختفي عند تغيير المجموعة). */
  const allPinsOnCurrentPlan = useMemo(() => {
    if (!plan) return []
    const groups = pinsByPlan[plan.id] ?? []
    const out: { pin: Pin; groupIndex: number }[] = []
    groups.forEach((g, gi) => {
      (g.pins ?? []).forEach((pin) => out.push({ pin, groupIndex: gi }))
    })
    return out
  }, [plan, pinsByPlan])

  /** كل الدبابيس من كل المجموعات وكل المخططات (للقائمة وإرسال كله للمهندس). */
  const allPinsAllGroups = useMemo(() => {
    const out: { pin: Pin; planId: string; groupIndex: number }[] = []
    allPlans.forEach((p) => {
      const groups = pinsByPlan[p.id] ?? []
      groups.forEach((g, gi) => {
        (g.pins ?? []).forEach((pin) => out.push({ pin, planId: p.id, groupIndex: gi }))
      })
    })
    return out
  }, [pinsByPlan, allPlans])

  /** Plans that have at least one pin with a note in ANY group (جمع كله وإرسال للمهندس). */
  const plansWithPinsToSend = useMemo(() => {
    return allPlans.filter((p) => {
      const groups = pinsByPlan[p.id] ?? []
      for (const g of groups) {
        const withNotes = (g.pins ?? []).filter((pin) => pin.note.trim())
        if (withNotes.length > 0) return true
      }
      return false
    })
  }, [allPlans, pinsByPlan])

  /** For each plan: combine pins with notes from ALL groups (إرسال كل الدبابيس). */
  const pinsPerPlanToSend = useMemo(() => {
    const map: { planId: string; pins: Array<{ x: number; y: number; color: string; note: string }> }[] = []
    for (const p of plansWithPinsToSend) {
      const groups = pinsByPlan[p.id] ?? []
      const combined: Array<{ x: number; y: number; color: string; note: string }> = []
      groups.forEach((g) => {
        (g.pins ?? [])
          .filter((pin) => pin.note.trim())
          .forEach((pin) => combined.push((({ id: _id, ...rest }) => rest)(pin)))
      })
      if (combined.length > 0) map.push({ planId: p.id, pins: combined })
    }
    return map
  }, [plansWithPinsToSend, pinsByPlan])

  /** Whether every pin (from all groups) has a note (so we can send all). */
  const allPinsHaveNotes = useMemo(() => {
    if (allPinsAllGroups.length === 0) return false
    return allPinsAllGroups.every(({ pin }) => pin.note.trim().length > 0)
  }, [allPinsAllGroups])

  /** Total pins used in a given group across all plans (for group selector buttons). */
  const totalPinsUsedInGroup = useCallback(
    (groupIndex: number) =>
      allPlans.reduce(
        (sum, p) => sum + (pinsByPlan[p.id]?.[groupIndex]?.pins?.length ?? 0),
        0
      ),
    [pinsByPlan, allPlans]
  )

  /** Colors already used in this group on ANY plan (reserved across plans). */
  const usedColorsInActiveGroup = useMemo(() => {
    const used = new Set<string>()
    for (const p of allPlans) {
      const groupPins = pinsByPlan[p.id]?.[activeGroupIndex]?.pins ?? []
      for (const pin of groupPins) {
        used.add(pin.color)
      }
    }
    return used
  }, [pinsByPlan, activeGroupIndex, allPlans])

  const [selectedColor, setSelectedColor] = useState(PIN_COLORS[0].value)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingPin, setEditingPin] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [orderInfo, setOrderInfo] = useState<{ deadline: string; status: string; pinPackPurchasesCount?: number } | null>(null)
  /** دبابيس مثبتة (ضغط مرتين) — لا تتحرك عند السحب */
  const [fixedPinIds, setFixedPinIds] = useState<Set<string>>(new Set())
  const lastPinClickRef = useRef<{ pinId: string; time: number }>({ pinId: '', time: 0 })

  /** اللون التالي المتاح في المجموعة الحالية (كل مجموعة لها ألوانها). */
  const getNextAvailableColor = useCallback(() => {
    const palette = getColorsForGroup(activeGroupIndex)
    const availableColor = palette.find((c) => !usedColorsInActiveGroup.has(c.value))
    return availableColor?.value || palette[0]?.value || ALL_PIN_COLORS[0].value
  }, [usedColorsInActiveGroup, activeGroupIndex])

  // عند تغيير المجموعة نحدّث اللون المختار إلى أول لون في ألوان المجموعة الجديدة
  useEffect(() => {
    const palette = getColorsForGroup(activeGroupIndex)
    if (palette[0]) setSelectedColor(palette[0].value)
  }, [activeGroupIndex])
  
  // Zoom and Pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [fitScale, setFitScale] = useState(1)
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isPanMode, setIsPanMode] = useState(false)
  
  // Note modal state
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteModalPin, setNoteModalPin] = useState<Pin | null>(null)
  const [noteModalPinPlanId, setNoteModalPinPlanId] = useState<string | null>(null)
  const [noteModalPinGroupIndex, setNoteModalPinGroupIndex] = useState<number>(0)
  const [editingPinGroupIndex, setEditingPinGroupIndex] = useState<number>(0)
  
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  /** عتبة الحركة (بكسل): إذا تحرك المؤشر أقل من هذا لا يُعد سحباً — النقر لعرض المعلومات لا يحرّك الدبوس */
  const PIN_DRAG_THRESHOLD_PX = 18
  const pinDragStartRef = useRef<{ x: number; y: number } | null>(null)
  const pinDragThresholdPassedRef = useRef(false)

  const fetchActivePlan = useCallback(async () => {
    try {
      const [plansResult, orderResult, pinPackResult] = await Promise.all([
        apiClient.get<{ success: boolean; plans: Plan[] }>(`/orders/${orderId}/plans`),
        apiClient.get<{ success: boolean; order: { deadline: string; status: string; isExpired?: boolean; pinPackPurchasesCount?: number } }>(`/orders/${orderId}`),
        apiClient.get<{ success: boolean; pinPack: PinPackSettings }>('/settings/pin-pack'),
      ])

      if (pinPackResult.success && pinPackResult.pinPack) {
        setPinPackSettings(pinPackResult.pinPack)
      }

      const purchasesCount = orderResult.success ? (orderResult.order.pinPackPurchasesCount ?? 0) : 0
      const groupsCount = Math.min(MAX_PIN_GROUPS, 1 + purchasesCount)
      setPinGroupsCount(groupsCount)

      if (orderResult.success) {
        setOrderInfo({
          deadline: orderResult.order.deadline,
          status: orderResult.order.status,
          pinPackPurchasesCount: orderResult.order.pinPackPurchasesCount,
        })

        if (isOrderExpired(orderResult.order.deadline) && orderResult.order.status === 'ARCHIVED') {
          toast.error('انتهى وقت الطلب. يمكنك شراء تمديد لإعادة تفعيل التعديلات')
          router.push(`/orders/${orderId}`)
          return
        }
      }

      if (plansResult.success && plansResult.plans.length > 0) {
        const plans = plansResult.plans
        setAllPlans(plans)

        const createEmptyGroups = () =>
          Array.from({ length: groupsCount }, (_, i) => ({ id: `group-${i}`, pins: [] as Pin[] }))

        const storageKey = `${REVISION_STATE_KEY}-${orderId}`
        try {
          const saved = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(storageKey) : null
          if (saved) {
            const parsed = JSON.parse(saved) as {
              pinGroups?: PinGroup[]
              pinsByPlan?: Record<string, PinGroup[]>
              activeGroupIndex?: number
              planId?: string
            }
            let nextPinsByPlan: Record<string, PinGroup[]>
            if (parsed.pinsByPlan && typeof parsed.pinsByPlan === 'object') {
              nextPinsByPlan = { ...parsed.pinsByPlan }
              for (const p of plans) {
                if (!nextPinsByPlan[p.id]) {
                  nextPinsByPlan[p.id] = createEmptyGroups()
                } else {
                  let groups = nextPinsByPlan[p.id]
                  while (groups.length < groupsCount) {
                    groups = [...groups, { id: `group-${groups.length}`, pins: [] }]
                  }
                  nextPinsByPlan[p.id] = groups.slice(0, groupsCount)
                }
              }
            } else if (parsed.pinGroups && Array.isArray(parsed.pinGroups) && parsed.planId) {
              let groups = parsed.pinGroups
              while (groups.length < groupsCount) {
                groups = [...groups, { id: `group-${groups.length}`, pins: [] }]
              }
              const trimmedGroups = groups.slice(0, groupsCount)
              nextPinsByPlan = {}
              for (const p of plans) {
                nextPinsByPlan[p.id] = p.id === parsed.planId ? trimmedGroups : createEmptyGroups()
              }
            } else {
              nextPinsByPlan = {}
              for (const p of plans) {
                nextPinsByPlan[p.id] = createEmptyGroups()
              }
            }
            setPinsByPlan(nextPinsByPlan)
            if (typeof parsed.activeGroupIndex === 'number' && parsed.activeGroupIndex >= 0 && parsed.activeGroupIndex < groupsCount) {
              setActiveGroupIndex(parsed.activeGroupIndex)
            }
            if (parsed.planId) {
              const found = plans.find((p) => p.id === parsed.planId)
              if (found) setPlan(found)
              else setPlan(plans[0])
            } else {
              setPlan(plans[0])
            }
            sessionStorage.removeItem(storageKey)
          } else {
            setPlan(plans[0])
            const initial: Record<string, PinGroup[]> = {}
            for (const p of plans) {
              initial[p.id] = createEmptyGroups()
            }
            setPinsByPlan(initial)
            setActiveGroupIndex(0)
          }
        } catch {
          setPlan(plans[0])
          const initial: Record<string, PinGroup[]> = {}
          for (const p of plans) {
            initial[p.id] = createEmptyGroups()
          }
          setPinsByPlan(initial)
          setActiveGroupIndex(0)
        }
      } else {
        toast.error('لا يوجد مخطط نشط')
        router.push(`/orders/${orderId}`)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل تحميل المخطط'
      toast.error(errorMessage)
      router.push(`/orders/${orderId}`)
    } finally {
      setLoading(false)
    }
  }, [orderId, router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchActivePlan()
    }
  }, [status, router, fetchActivePlan])

  // Compute fit-to-container scale from image natural dimensions
  const computeFitScale = useCallback((size: { width: number; height: number }): number => {
    const container = imageContainerRef.current
    if (!container) return 1
    const cw = container.clientWidth
    const ch = container.clientHeight
    if (cw <= 0 || ch <= 0 || size.width <= 0 || size.height <= 0) return 1
    return Math.min(cw / size.width, ch / size.height, 1)
  }, [])

  // Handle image load - get natural dimensions and compute fit scale (Risk 1 & 2)
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    if (nw > 0 && nh > 0) {
      const size = { width: nw, height: nh }
      setImageNaturalSize(size)
      const scale = computeFitScale(size)
      setFitScale(scale)
      setZoom(scale)
      setPan({ x: 0, y: 0 })
    }
  }, [computeFitScale])

  // ResizeObserver: re-compute fitScale when container size changes (Risk 3)
  useEffect(() => {
    const el = imageContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (imageNaturalSize) {
        const scale = computeFitScale(imageNaturalSize)
        setFitScale(scale)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [imageNaturalSize, computeFitScale])

  // Reset imageNaturalSize when plan changes (new image will trigger onLoad)
  useEffect(() => {
    setImageNaturalSize(null)
    setFitScale(1)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [plan?.id])

  // Handle zoom with mouse wheel (min = fitScale, max = 3)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!imageContainerRef.current) return
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(fitScale, Math.min(3, zoom + delta))
    setZoom(newZoom)
  }, [zoom, fitScale])

  // Handle pan start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isPanMode || editingPin) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [isPanMode, pan, editingPin])

  // Handle pan move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !isPanMode || editingPin) return
    e.preventDefault()
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }, [isDragging, isPanMode, dragStart, editingPin])

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handlers for pan (no preventDefault here - see useEffect below for passive: false)
  const handleTouchStartPan = useCallback((e: React.TouchEvent) => {
    if (!isPanMode || editingPin) return
    const touch = e.touches[0]
    if (touch) {
      setIsDragging(true)
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y })
    }
  }, [isPanMode, pan, editingPin])

  const handleTouchMovePan = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !isPanMode || editingPin) return
    const touch = e.touches[0]
    if (touch) {
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      })
    }
  }, [isDragging, isPanMode, dragStart, editingPin])

  const handleTouchEndPan = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Refs so passive: false listeners always see latest state
  const panRef = useRef(pan)
  const dragStartRef = useRef(dragStart)
  panRef.current = pan
  dragStartRef.current = dragStart

  // Attach wheel and touch listeners with passive: false so preventDefault works (avoids console warning and scroll blocking)
  useEffect(() => {
    const el = imageContainerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom((z) => Math.max(fitScale, Math.min(3, z + delta)))
    }
    const onTouchStart = (e: TouchEvent) => {
      if (!isPanMode || editingPin) return
      e.preventDefault()
      const touch = e.touches[0]
      if (touch) {
        const p = panRef.current
        setDragStart({ x: touch.clientX - p.x, y: touch.clientY - p.y })
        setIsDragging(true)
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || !isPanMode || editingPin) return
      e.preventDefault()
      const touch = e.touches[0]
      if (touch) {
        const d = dragStartRef.current
        setPan({ x: touch.clientX - d.x, y: touch.clientY - d.y })
      }
    }
    const onTouchEnd = () => setIsDragging(false)

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [fitScale, isPanMode, editingPin, isDragging])

  // Handle image click to add pin
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    setEditingPin(null)
    if (isPanMode || !imageRef.current || !plan) return

    if (totalPinsUsedInActiveGroup >= MAX_PINS) {
      toast.error(`استخدمت ${MAX_PINS} دبابيس لهذه المجموعة على المخططات`)
      return
    }

    const rect = imageRef.current.getBoundingClientRect()
    const containerRect = imageContainerRef.current?.getBoundingClientRect()
    
    if (!containerRect) return

    // Pin position as percentage (0-100). getBoundingClientRect returns transformed rect.
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    // Use next available color (no duplicates within this plan)
    const pinColor = getNextAvailableColor()

    const newPin: Pin = {
      id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      color: pinColor,
      note: '',
    }

    setActiveGroupPins((prev) => [...prev, newPin])
    setSelectedColor(pinColor)
    openNoteModal(newPin)
  }

  // Open note modal for editing (planId و groupIndex لتحديث الدبوس الصحيح من أي مجموعة)
  const openNoteModal = (pin: Pin, planId?: string, groupIndex?: number) => {
    setNoteModalPin(pin)
    setNoteModalPinPlanId(planId ?? plan?.id ?? null)
    setNoteModalPinGroupIndex(groupIndex ?? activeGroupIndex)
    setNoteText(pin.note)
    setShowNoteModal(true)
  }

  // Update pin note (uses noteModalPinPlanId and noteModalPinGroupIndex)
  const updatePinNote = () => {
    if (!noteModalPin) return
    const targetPlanId = noteModalPinPlanId ?? plan?.id
    if (!targetPlanId) {
      closeNoteModal()
      return
    }
    setPinsForPlanAndGroup(targetPlanId, noteModalPinGroupIndex, (prev) =>
      prev.map((p) => (p.id === noteModalPin.id ? { ...p, note: noteText } : p))
    )
    closeNoteModal()
  }

  // Update pin position (groupIndex لتحديث الدبوس في المجموعة الصحيحة)
  const updatePinPosition = (pinId: string, newX: number, newY: number, groupIndex?: number) => {
    const gIdx = groupIndex ?? editingPinGroupIndex
    if (!plan) return
    setPinsForPlanAndGroup(plan.id, gIdx, (prev) =>
      prev.map((pin) =>
        pin.id === pinId
          ? { ...pin, x: Math.max(0, Math.min(100, newX)), y: Math.max(0, Math.min(100, newY)) }
          : pin
      )
    )
  }

  // Colors used in a specific group (for updatePinColor when groupIndex provided)
  const usedColorsInGroup = useCallback(
    (groupIdx: number) => {
      const used = new Set<string>()
      allPlans.forEach((p) => {
        const list = pinsByPlan[p.id]?.[groupIdx]?.pins ?? []
        list.forEach((pin) => used.add(pin.color))
      })
      return used
    },
    [pinsByPlan, allPlans]
  )

  // Update pin color (groupIndex لتحديث الدبوس في المجموعة الصحيحة)
  const updatePinColor = (pinId: string, color: string, groupIndex?: number) => {
    const gIdx = groupIndex ?? activeGroupIndex
    const usedInGroup = usedColorsInGroup(gIdx)
    const currentPin = (pinsByPlan[plan?.id ?? '']?.[gIdx]?.pins ?? []).find((p) => p.id === pinId)
    const currentPinColor = currentPin?.color
    const colorUsedElsewhere = usedInGroup.has(color) && currentPinColor !== color
    if (colorUsedElsewhere) {
      toast.error('هذا اللون مستخدم في هذه المجموعة. يرجى اختيار لون آخر')
      return
    }
    if (!plan) return
    setPinsForPlanAndGroup(plan.id, gIdx, (prev) => prev.map((pin) => (pin.id === pinId ? { ...pin, color } : pin)))
    setSelectedColor(color)
  }

  // Remove pin (planId و groupIndex لتحديد المجموعة والمخطط)
  const removePin = (pinId: string, planId?: string, groupIndex?: number) => {
    const targetPlanId = planId ?? plan?.id
    const gIdx = groupIndex ?? activeGroupIndex
    if (targetPlanId != null) {
      setPinsForPlanAndGroup(targetPlanId, gIdx, (prev) => prev.filter((p) => p.id !== pinId))
    }
    if (noteModalPin?.id === pinId) {
      closeNoteModal()
    }
  }

  // Close note modal
  const closeNoteModal = () => {
    setShowNoteModal(false)
    setNoteModalPin(null)
    setNoteModalPinPlanId(null)
    setNoteText('')
  }

  // Reset zoom and pan to fit-to-container center (عودة للمنتصف)
  const resetView = useCallback(() => {
    setZoom(fitScale)
    setPan({ x: 0, y: 0 })
  }, [fitScale])

  // Handle pin drag — التحريك يبدأ فقط بعد سحب فعلي (تجاوز عتبة) حتى لا يتحرك الدبوس عند النقر فقط
  const handlePinDragStart = (e: React.MouseEvent | React.TouchEvent, pin: Pin, groupIndex?: number) => {
    if (isPanMode) return
    e.stopPropagation()
    const clientX = 'touches' in e ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY : (e as React.MouseEvent).clientY
    if (clientX != null && clientY != null) {
      pinDragStartRef.current = { x: clientX, y: clientY }
      pinDragThresholdPassedRef.current = false
    }
    setEditingPin(pin.id)
    setEditingPinGroupIndex(groupIndex ?? activeGroupIndex)
  }

  const handlePinDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!editingPin || !imageRef.current || !imageContainerRef.current) return
    if (fixedPinIds.has(editingPin)) return

    const clientX = 'touches' in e ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY : (e as React.MouseEvent).clientY
    
    if (clientX === undefined || clientY === undefined) return

    if (!pinDragThresholdPassedRef.current && pinDragStartRef.current) {
      const dx = clientX - pinDragStartRef.current.x
      const dy = clientY - pinDragStartRef.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < PIN_DRAG_THRESHOLD_PX) return
      pinDragThresholdPassedRef.current = true
    }
    
    e.preventDefault()
    e.stopPropagation()
    
    const rect = imageRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100

    updatePinPosition(editingPin, x, y, editingPinGroupIndex)
  }

  const DOUBLE_CLICK_MS = 400
  const handlePinClick = (e: React.MouseEvent, pin: Pin, groupIndex: number) => {
    if (isPanMode) return
    e.stopPropagation()
    const now = Date.now()
    const last = lastPinClickRef.current
    if (last.pinId === pin.id && now - last.time < DOUBLE_CLICK_MS) {
      lastPinClickRef.current = { pinId: '', time: 0 }
      setFixedPinIds((prev) => {
        const next = new Set(prev)
        if (next.has(pin.id)) {
          next.delete(pin.id)
          toast.success('تم إلغاء تثبيت الدبوس')
        } else {
          next.add(pin.id)
          toast.success('تم تثبيت الدبوس — لن يتحرك عند السحب')
        }
        return next
      })
      return
    }
    lastPinClickRef.current = { pinId: pin.id, time: now }
    if (editingPin !== pin.id) {
      setEditingPin(pin.id)
      setEditingPinGroupIndex(groupIndex)
    }
  }

  const handlePinDragEnd = () => {
    const didDrag = pinDragThresholdPassedRef.current
    pinDragStartRef.current = null
    pinDragThresholdPassedRef.current = false
    // إذا كان مجرد نقر (لم يسحب) نترك القائمة مفتوحة لعرض المعلومات؛ إذا سحب نغلق
    if (didDrag) setEditingPin(null)
  }
  
  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent, pin: Pin, groupIndex?: number) => {
    if (isPanMode) return
    handlePinDragStart(e, pin, groupIndex)
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    handlePinDrag(e)
  }
  
  const handleTouchEnd = () => {
    handlePinDragEnd()
  }

  // Handle submit — إرسال كل الدبابيس في المجموعة الحالية (على كل المخططات)
  const handleSubmit = async () => {
    if (orderInfo && isOrderExpired(orderInfo.deadline) && orderInfo.status === 'ARCHIVED') {
      toast.error('انتهى وقت الطلب. يمكنك شراء تمديد لإعادة تفعيل التعديلات')
      router.push(`/orders/${orderId}`)
      return
    }

    if (allPinsAllGroups.length === 0) {
      toast.error('يجب إضافة دبوس واحد على الأقل')
      return
    }

    if (!allPinsHaveNotes) {
      toast.error('يجب إضافة ملاحظة لكل دبوس قبل الإرسال')
      return
    }

    if (pinsPerPlanToSend.length === 0) {
      toast.error('يجب إضافة ملاحظة لكل دبوس')
      return
    }

    setSubmitting(true)
    try {
      let successCount = 0
      const total = pinsPerPlanToSend.length
      for (let i = 0; i < pinsPerPlanToSend.length; i++) {
        const { planId, pins: pinsPayload } = pinsPerPlanToSend[i]
        const result = await apiClient.post<{ success: boolean; revisionRequest?: unknown; error?: string }>('/revisions/create', {
          orderId,
          planId,
          pins: pinsPayload,
        })
        if (result.success) {
          successCount++
        } else {
          const errorMessage = result.error || 'فشل إرسال طلب التعديل'
          toast.error(errorMessage)
          setSubmitting(false)
          return
        }
      }

      if (successCount > 0) {
        toast.success(
          total > 1
            ? `تم إرسال كل الدبابيس بنجاح (${successCount} طلب تعديل)`
            : 'تم إرسال طلب التعديل بنجاح'
        )
        router.push(`/orders/${orderId}`)
      }
    } catch (error: unknown) {
      let errorMessage = 'فشل إرسال طلب التعديل'
      if (error instanceof Error) {
        errorMessage = error.message
        if (errorMessage.includes('فشل تحليل استجابة الخادم')) {
          errorMessage = 'حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.'
        } else if (errorMessage.includes('غير مصرح')) {
          errorMessage = 'غير مصرح لك بطلب تعديل على هذا الطلب'
        } else if (errorMessage.includes('لا توجد تعديلات متبقية')) {
          errorMessage = 'لا توجد تعديلات متبقية. يمكنك شراء تعديلات إضافية من صفحة الطلب.'
        } else if (errorMessage.includes('لا يوجد مخطط نشط')) {
          errorMessage = 'لا يوجد مخطط نشط لطلب التعديل عليه. يرجى الانتظار حتى يتم رفع مخطط.'
        }
      }
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  if (!plan) {
    return null
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex flex-col">
      <Header />

      <main className="container mx-auto px-2 sm:px-4 py-4 flex-1 max-w-7xl">
        <BackButton href={`/orders/${orderId}`} label="العودة لتفاصيل الطلب" />

        <Card className="mt-4 dark:bg-charcoal-800 dark:border-charcoal-600">
          {orderInfo && isOrderExpired(orderInfo.deadline) && orderInfo.status === 'ARCHIVED' && (
            <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                <strong>ملاحظة:</strong> انتهى وقت الطلب. التعديلات غير متاحة. يمكنك شراء تمديد لإعادة تفعيلها.
              </p>
              <Button
                onClick={async () => {
                  if (confirm('هل تريد شراء تمديد لمدة يوم واحد (100 ريال)؟ سيتم إضافة تعديل واحد وإعادة تفعيل الطلب.')) {
                    try {
                      const result = await apiClient.post<{ success: boolean; message: string }>(`/orders/${orderId}/buy-extension`)
                      if (result.success) {
                        toast.success(result.message)
                        fetchActivePlan()
                      }
                    } catch (error: unknown) {
                      const errorMessage = error instanceof Error ? error.message : 'فشل شراء التمديد'
                      toast.error(errorMessage)
                    }
                  }
                }}
                className="w-full"
              >
                شراء تمديد (يوم + تعديل) - 100 ريال
              </Button>
            </div>
          )}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-charcoal dark:text-cream">طلب تعديل المخطط</h1>
              <div className="text-sm text-blue-gray dark:text-greige">
                المجموعة {activeGroupIndex + 1}: {totalPinsUsedInActiveGroup}/{MAX_PINS} دبابيس
                {pinGroupsCount > 1 && (
                  <span className="mr-2 text-charcoal dark:text-cream"> (من {pinGroupsCount} مجموعة)</span>
                )}
              </div>
            </div>
            <p className="text-sm sm:text-base text-blue-gray dark:text-greige">
              انقر على المخطط لإضافة دبابيس التعديل. يمكنك تكبير/تصغير المخطط وتحريكه لوضع الدبابيس بدقة.
            </p>
            <p className="text-xs text-blue-gray dark:text-greige mt-1">
              إضافة نقاط التعديل تتم ضمن نفس الطلب ولا تنشئ طلباً جديداً.
            </p>
          </div>

          {/* Pin group selector */}
          {pinGroupsCount > 1 && plan && (
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-charcoal dark:text-cream mb-2">اختر مجموعة الدبابيس</h2>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: pinGroupsCount }, (_, i) => {
                  const groups = getOrCreateGroupsForPlan(plan.id)
                  const group = groups[i]
                  const totalUsed = totalPinsUsedInGroup(i)
                  return (
                    <button
                      key={group?.id ?? i}
                      type="button"
                      onClick={() => {
                        setActiveGroupIndex(i)
                        setEditingPin(null)
                        closeNoteModal()
                      }}
                      className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                        activeGroupIndex === i
                          ? 'border-rocky-blue dark:border-rocky-blue-500 bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300'
                          : 'border-greige/30 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream hover:border-rocky-blue/50'
                      }`}
                    >
                      مجموعة {i + 1} ({totalUsed}/{MAX_PINS})
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Buy pin pack CTA when 0 or 1 pins left */}
          {pinGroupsCount < MAX_PIN_GROUPS && pinPackSettings && pinPackSettings.pinPackPrice > 0 && totalPinsUsedInActiveGroup <= 1 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                {totalPinsUsedInActiveGroup === 0
                  ? (pinPackSettings.messageWhen0Left || 'انتهت دبابيس هذه المجموعة. يمكنك شراء مجموعة جديدة.')
                  : (pinPackSettings.messageWhen1Left || 'دبوس واحد متبقي. يمكنك شراء مجموعة إضافية.')}
              </p>
              <div className="flex flex-wrap items-center gap-2 gap-y-1 mb-2">
                {pinPackSettings.pinPackOldPrice != null && pinPackSettings.pinPackOldPrice > 0 && (
                  <span className="text-sm text-blue-gray dark:text-greige line-through">
                    {pinPackSettings.pinPackOldPrice} ريال
                  </span>
                )}
                <span className="text-lg font-bold text-charcoal dark:text-cream">{pinPackSettings.pinPackPrice} ريال</span>
                {(pinPackSettings.pinPackDiscountPercent ?? 0) > 0 && (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-medium">
                    خصم {pinPackSettings.pinPackDiscountPercent}%
                  </span>
                )}
                {pinPackSettings.pinPackOldPrice != null &&
                  pinPackSettings.pinPackOldPrice > 0 &&
                  pinPackSettings.pinPackPrice < pinPackSettings.pinPackOldPrice && (
                    <span className="text-xs text-green-700 dark:text-green-300 font-medium">
                      وفر {(pinPackSettings.pinPackOldPrice - pinPackSettings.pinPackPrice).toFixed(2)} ريال
                    </span>
                  )}
              </div>
              <p className="text-xs text-blue-gray dark:text-greige mb-3">
                السعر المعروض هو السعر الحالي. لا يؤثر على ما تم شراؤه سابقاً في هذا الطلب.
              </p>
              <Button
                onClick={() => {
                  const storageKey = `${REVISION_STATE_KEY}-${orderId}`
                  try {
                    sessionStorage.setItem(
                      storageKey,
                      JSON.stringify({
                        pinsByPlan,
                        activeGroupIndex,
                        planId: plan?.id,
                      })
                    )
                  } catch {
                    /* ignore */
                  }
                  router.push(`/orders/${orderId}/buy-pin-pack`)
                }}
                className="w-full sm:w-auto"
              >
                شراء مجموعة دبابيس
              </Button>
            </div>
          )}

          {/* Max pin groups message */}
          {pinGroupsCount >= MAX_PIN_GROUPS && totalPinsUsedInActiveGroup <= 1 && (
            <div className="mb-4 p-4 bg-greige/20 dark:bg-charcoal-700 rounded-lg border border-greige/30 dark:border-charcoal-600">
              <p className="text-sm text-blue-gray dark:text-greige">
                وصلت للحد الأقصى من مجموعات الدبابيس ({MAX_PIN_GROUPS}). لا يمكنك شراء المزيد.
              </p>
            </div>
          )}

          {/* Plan selector when multiple plans */}
          {allPlans.length > 1 && (
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-charcoal dark:text-cream mb-2">اختر المخطط للتعديل</h2>
              <div className="flex flex-wrap gap-3">
                {allPlans.map((p, index) => {
                  const planPinsCount = getPlanPinsCount(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPlan(p)
                        setEditingPin(null)
                        closeNoteModal()
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                        plan?.id === p.id
                          ? 'border-rocky-blue dark:border-rocky-blue-500 bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300'
                          : 'border-greige/30 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream hover:border-rocky-blue/50'
                      }`}
                    >
                      <span>
                        {p.fileName?.trim() ? `مخطط ${index + 1} - ${p.fileName}` : `مخطط ${index + 1}`}
                        {planPinsCount > 0 && ` (${planPinsCount})`}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="mb-4 p-3 bg-greige/20 dark:bg-charcoal-700 rounded-lg border border-greige/30 dark:border-charcoal-600">
            <div className="flex flex-wrap items-center gap-3">
              {/* Color Picker — ألوان المجموعة الحالية فقط */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap text-charcoal dark:text-cream">لون الدبوس (مجموعة {activeGroupIndex + 1}):</label>
                <div className="flex gap-1 sm:gap-2">
                  {getColorsForGroup(activeGroupIndex).map((color) => {
                    const isUsed = usedColorsInActiveGroup.has(color.value)
                    const isSelected = selectedColor === color.value
                    
                    return (
                      <button
                        key={color.value}
                        onClick={() => {
                          if (!isUsed) {
                            setSelectedColor(color.value)
                          } else {
                            toast.error(`اللون ${color.label} مستخدم بالفعل`)
                          }
                        }}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all relative ${
                          isSelected
                            ? 'border-gray-900 dark:border-gray-100 scale-110 shadow-md'
                            : isUsed
                            ? 'border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed'
                            : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={isUsed ? `${color.label} - مستخدم` : color.label}
                        disabled={isUsed}
                      >
                        {isUsed && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <X className="w-3 h-3 text-white drop-shadow-lg" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                <span className="text-xs text-blue-gray dark:text-greige hidden sm:inline">
                  (كل لون يستخدم مرة واحدة)
                </span>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border-r border-greige/30 dark:border-charcoal-600 pr-3">
                <button
                  onClick={() => setZoom(Math.max(fitScale, zoom - 0.1))}
                  className="p-2 hover:bg-greige/30 dark:hover:bg-charcoal-600 rounded transition-colors text-charcoal dark:text-cream"
                  title="تصغير"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium min-w-[3rem] text-center text-charcoal dark:text-cream">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                  className="p-2 hover:bg-greige/30 dark:hover:bg-charcoal-600 rounded transition-colors text-charcoal dark:text-cream"
                  title="تكبير"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={resetView}
                  className="p-2 hover:bg-greige/30 dark:hover:bg-charcoal-600 rounded transition-colors mr-1 text-charcoal dark:text-cream"
                  title="إعادة تعيين"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Pan Mode Toggle */}
              <button
                onClick={() => setIsPanMode(!isPanMode)}
                className={`px-3 py-2 rounded transition-colors flex items-center gap-2 ${
                  isPanMode 
                    ? 'bg-rocky-blue dark:bg-rocky-blue-600 text-cream' 
                    : 'bg-white dark:bg-charcoal-700 hover:bg-greige/20 dark:hover:bg-charcoal-600 text-charcoal dark:text-cream'
                }`}
                title="وضع التحريك"
              >
                <Move className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">تحريك</span>
              </button>
            </div>
          </div>

          {/* Plan Image with Pins */}
          <div className="relative mb-4 bg-greige/20 dark:bg-charcoal-700 rounded-lg overflow-hidden border border-greige/30 dark:border-charcoal-600">
            {plan.fileType === 'image' ? (
              <div
                ref={imageContainerRef}
                className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] flex items-center justify-center overflow-auto cursor-crosshair touch-pan-y touch-pan-x"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchEnd={handleTouchEndPan}
                style={{ cursor: isPanMode ? 'grab' : editingPin ? 'grabbing' : 'crosshair' }}
              >
                {/* الدبابيس مرتبطة بالمخطط الحالي — كل مخطط له دبابيسه الخاصة */}
                <div
                  className="relative inline-block min-w-full flex-shrink-0"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s',
                    minHeight: 300,
                  }}
                >
                  {plan.fileUrl ? (
                  <Image
                    ref={imageRef}
                    src={plan.fileUrl}
                    alt="Plan"
                    width={1200}
                    height={800}
                    className="w-full h-auto select-none"
                    draggable={false}
                    onClick={handleImageClick}
                    onLoad={handleImageLoad}
                    onMouseMove={handlePinDrag}
                    onMouseUp={handlePinDragEnd}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    priority
                    quality={90}
                  />
                  ) : (
                    <div className="flex items-center justify-center min-h-[300px] p-8 text-center text-amber-700 dark:text-amber-300">
                      <p>تم حذف الملف من الأرشيف بعد 45 يوماً من الموعد النهائي. لا يمكن إضافة تعديلات على هذا المخطط.</p>
                    </div>
                  )}
                  {/* Render Pins — كل دبابيس المخطط الحالي من كل المجموعات (لا تختفي) */}
                  {allPinsOnCurrentPlan.map(({ pin, groupIndex }, idx) => (
                    <div
                      key={pin.id}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move touch-none ${
                        editingPin === pin.id ? 'z-20' : 'z-10'
                      }`}
                      style={{
                        left: `${pin.x}%`,
                        top: `${pin.y}%`,
                        pointerEvents: 'auto',
                      }}
                      onMouseDown={(e) => handlePinDragStart(e, pin, groupIndex)}
                      onMouseUp={() => handlePinDragEnd()}
                      onTouchStart={(e) => handleTouchStart(e, pin, groupIndex)}
                      onTouchEnd={() => handleTouchEnd()}
                      onClick={(e) => handlePinClick(e, pin, groupIndex)}
                    >
                      <div
                        className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-lg transition-all ${
                          editingPin === pin.id ? 'scale-125 ring-2 ring-primary-500' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: pin.color }}
                      />
                      {/* أيقونة القفل عند تثبيت الدبوس */}
                      {fixedPinIds.has(pin.id) && (
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-white dark:bg-gray-800 rounded-full border border-gray-700 dark:border-gray-300 flex items-center justify-center" title="دبوس مثبت">
                          <Lock className="w-2.5 h-2.5 text-gray-700 dark:text-gray-300" />
                        </div>
                      )}
                      {/* رقم مميز لكل دبوس على المخطط (لون + رقم) */}
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-white dark:bg-gray-800 rounded-full border-2 border-gray-800 dark:border-gray-200 flex items-center justify-center text-xs font-bold text-gray-900 dark:text-gray-100">
                        {idx + 1}
                      </div>

                      {/* Pin Actions Menu */}
                      <div 
                        className={`absolute top-10 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-gray-200 dark:border-gray-700 p-2 min-w-[180px] z-30 ${
                          editingPin === pin.id 
                            ? 'opacity-100 pointer-events-auto' 
                            : 'opacity-0 pointer-events-none hover:opacity-100 hover:pointer-events-auto'
                        } transition-opacity`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-xs font-semibold mb-2 text-center border-b border-gray-200 dark:border-gray-700 pb-1 text-gray-900 dark:text-gray-100">
                          مجموعة {groupIndex + 1} — دبوس #{idx + 1}
                        </div>
                        <div className="space-y-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setFixedPinIds((prev) => {
                                const next = new Set(prev)
                                if (next.has(pin.id)) {
                                  next.delete(pin.id)
                                  toast.success('تم إلغاء تثبيت الدبوس')
                                } else {
                                  next.add(pin.id)
                                  toast.success('تم تثبيت الدبوس — لن يتحرك عند السحب')
                                }
                                return next
                              })
                            }}
                            className="w-full text-right px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-gray-700 dark:text-gray-300"
                          >
                            {fixedPinIds.has(pin.id) ? (
                              <>
                                <Unlock className="w-3 h-3" />
                                إلغاء التثبيت
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                تثبيت الدبوس
                              </>
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openNoteModal(pin, plan?.id, groupIndex)
                            }}
                            className="w-full text-right px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2 text-gray-700 dark:text-gray-300"
                          >
                            <Edit2 className="w-3 h-3" />
                            {pin.note ? 'تعديل الملاحظة' : 'إضافة ملاحظة'}
                          </button>
                          <div className="flex gap-1 p-1">
                            {getColorsForGroup(groupIndex).map((color) => (
                              <button
                                key={color.value}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updatePinColor(pin.id, color.value, groupIndex)
                                }}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${
                                  pin.color === color.value
                                    ? 'border-gray-900 dark:border-gray-100 scale-110'
                                    : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                                }`}
                                style={{ backgroundColor: color.value }}
                                title={color.label}
                              />
                            ))}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removePin(pin.id, plan?.id, groupIndex)
                            }}
                            className="w-full text-right px-2 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded flex items-center gap-2"
                          >
                            <X className="w-3 h-3" />
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <p className="text-blue-gray dark:text-greige">المخططات بصيغة PDF لا تدعم التعديل التفاعلي حالياً</p>
                <p className="text-sm text-blue-gray dark:text-greige mt-2">يرجى استخدام المخططات بصيغة الصور</p>
              </div>
            )}
          </div>

          {/* عودة للمنتصف button - Return to center */}
          {plan.fileType === 'image' && (
            <div className="flex justify-center mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={resetView}
                className="flex items-center gap-2"
              >
                <Crosshair className="w-4 h-4" />
                عودة للمنتصف
              </Button>
            </div>
          )}

          {/* Pins List — كل الدبابيس من كل المجموعات وكل المخططات (ألوان + أرقام مميزة) */}
          {allPinsAllGroups.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold mb-1 text-sm sm:text-base text-charcoal dark:text-cream">
                الدبابيس المضافة ({allPinsAllGroups.length}) — من {pinGroupsCount} مجموعة
              </h3>
              <p className="text-xs text-blue-gray dark:text-greige mb-2">
                أضف ملاحظة لكل دبوس ثم اضغط «إرسال كل الدبابيس» لتجميع الكل وإرساله للمهندس.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allPinsAllGroups.map(({ pin, planId, groupIndex }, index) => {
                  const planLabel = allPlans.find((p) => p.id === planId)?.fileName?.trim() || `مخطط ${allPlans.findIndex((p) => p.id === planId) + 1}`
                  return (
                    <div
                      key={pin.id}
                      className="flex items-start gap-3 p-3 bg-greige/10 dark:bg-charcoal-700 rounded-lg border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-600 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white dark:border-charcoal-800 shadow"
                          style={{ backgroundColor: pin.color }}
                        />
                        <span className="font-bold text-sm text-charcoal dark:text-cream">{index + 1}</span>
                        <span className="text-xs text-blue-gray dark:text-greige">مجموعة {groupIndex + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {pin.note ? (
                          <p className="text-sm break-words text-charcoal dark:text-cream">{pin.note}</p>
                        ) : (
                          <p className="text-sm text-blue-gray dark:text-greige">بدون ملاحظة</p>
                        )}
                        {allPlans.length > 1 && (
                          <p className="text-xs text-blue-gray dark:text-greige mt-1">{planLabel}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openNoteModal(pin, planId, groupIndex)}
                          className="p-1 text-rocky-blue dark:text-rocky-blue-300 hover:text-rocky-blue-600 dark:hover:text-rocky-blue-400"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removePin(pin.id, planId, groupIndex)}
                          className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          title="حذف"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Submit Button — تجميع كل الدبابيس من كل المجموعات وإرسالها للمهندس */}
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/orders/${orderId}`)}
              className="w-full sm:w-auto"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || allPinsAllGroups.length === 0 || !allPinsHaveNotes}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 ml-2" />
                  {pinsPerPlanToSend.length > 1
                    ? `إرسال كل الدبابيس (${allPinsAllGroups.length}) — ${pinsPerPlanToSend.length} تعديلات`
                    : `إرسال طلب التعديل (${allPinsAllGroups.length})`}
                </>
              )}
            </Button>
          </div>
          {pinsPerPlanToSend.length > 0 && allPinsAllGroups.length > 0 && (
            <p className="text-xs text-blue-gray dark:text-greige mt-1 text-end">
              سيتم تجميع كل الدبابيس من كل المجموعات وإرسالها على المخططات واستهلاك {pinsPerPlanToSend.length} من رصيد التعديلات.
            </p>
          )}
        </Card>
      </main>

      {/* Note Modal */}
      {showNoteModal && noteModalPin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto dark:bg-charcoal-800 dark:border-charcoal-600">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-charcoal dark:text-cream">
                <div
                  className="w-6 h-6 rounded-full border-2 border-white dark:border-charcoal-800 shadow"
                  style={{ backgroundColor: noteModalPin.color }}
                />
                ملاحظة الدبوس #{allPinsAllGroups.findIndex((e) => e.pin.id === noteModalPin.id) + 1 || 1}
              </h2>
              <button
                onClick={closeNoteModal}
                className="p-2 hover:bg-greige/20 dark:hover:bg-charcoal-700 rounded transition-colors text-charcoal dark:text-cream"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-charcoal dark:text-cream">اكتب ملاحظة التعديل:</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="مثال: تغيير موقع الباب الرئيسي إلى اليسار..."
                className="w-full min-h-[150px] p-3 border border-greige/30 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream placeholder-blue-gray dark:placeholder-greige focus:ring-2 focus:ring-rocky-blue focus:border-transparent resize-y"
                autoFocus
              />
              <p className="text-xs text-blue-gray dark:text-greige mt-1">
                {noteText.length}/500 حرف
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={closeNoteModal}
                className="w-full sm:w-auto"
              >
                إلغاء
              </Button>
              <Button
                onClick={updatePinNote}
                disabled={!noteText.trim()}
                className="w-full sm:w-auto"
              >
                حفظ الملاحظة
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
