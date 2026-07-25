import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react'
import { wheelZoomFactor } from '../domain/zoom'

const DRAG_THRESHOLD_PX = 5

type Point = { x: number; y: number }

type DragOrigin = {
  pointerId: number
  clientX: number
  clientY: number
  scrollLeft: number
  scrollTop: number
}

function exceedsDragThreshold(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > DRAG_THRESHOLD_PX
}

function pinchDistances(
  points: Map<number, Point>,
  pointerId: number,
  next: Point,
): { before: number; after: number; midY: number } | null {
  const [a, b] = [...points.values()]
  if (!a || !b) return null
  const before = Math.hypot(a.x - b.x, a.y - b.y)
  // Why: the key being set is an existing pointer (confirmed present by the caller),
  // so the size doesn't change and values() still always returns two elements
  points.set(pointerId, next)
  const [a2, b2] = [...points.values()]
  if (!a2 || !b2) return null
  const after = Math.hypot(a2.x - b2.x, a2.y - b2.y)
  return { before, after, midY: (a2.y + b2.y) / 2 }
}

export function usePointerGestures({
  containerRef,
  isHelpOpen,
  applyZoomAtContainerOffset,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  isHelpOpen: boolean
  applyZoomAtContainerOffset: (factor: number, containerOffset: number) => void
}) {
  const pointers = useRef(new Map<number, Point>())
  const dragOrigin = useRef<DragOrigin | null>(null)
  const suppressClickRef = useRef(false)
  const isDraggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    isDraggingRef.current = isDragging
  }, [isDragging])

  useEffect(() => {
    const removePointer = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId)
      if (dragOrigin.current?.pointerId === e.pointerId) {
        dragOrigin.current = null
        setIsDragging(false)
        if (isDraggingRef.current) suppressClickRef.current = true
      }
    }
    window.addEventListener('pointerup', removePointer)
    window.addEventListener('pointercancel', removePointer)
    return () => {
      window.removeEventListener('pointerup', removePointer)
      window.removeEventListener('pointercancel', removePointer)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const rect = container.getBoundingClientRect()
      applyZoomAtContainerOffset(wheelZoomFactor(e.deltaY), e.clientY - rect.top)
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [applyZoomAtContainerOffset, containerRef])

  const handlePointerDown = (e: ReactPointerEvent) => {
    if (isHelpOpen) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size >= 2) {
      dragOrigin.current = null
      setIsDragging(false)
      return
    }
    const container = containerRef.current
    if (e.pointerType !== 'mouse' || e.button !== 0 || !container) return
    dragOrigin.current = {
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    }
  }

  const handleDragMove = (e: ReactPointerEvent) => {
    const drag = dragOrigin.current
    if (!drag || drag.pointerId !== e.pointerId || pointers.current.size >= 2) return
    const dx = e.clientX - drag.clientX
    const dy = e.clientY - drag.clientY
    if (!isDragging && exceedsDragThreshold(dx, dy)) setIsDragging(true)
    if (isDragging || exceedsDragThreshold(dx, dy)) {
      const container = containerRef.current
      if (container) {
        container.scrollLeft = drag.scrollLeft - dx
        container.scrollTop = drag.scrollTop - dy
      }
    }
  }

  const handlePinchMove = (e: ReactPointerEvent) => {
    const prevPoint = pointers.current.get(e.pointerId)
    if (!prevPoint || pointers.current.size !== 2) {
      if (prevPoint) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      return
    }
    const distances = pinchDistances(pointers.current, e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    })
    if (!distances || distances.before <= 0) return
    const rect = containerRef.current?.getBoundingClientRect()
    const anchorOffset = distances.midY - (rect?.top ?? 0)
    applyZoomAtContainerOffset(distances.after / distances.before, anchorOffset)
  }

  const handlePointerMove = (e: ReactPointerEvent) => {
    if (isHelpOpen) return
    handleDragMove(e)
    handlePinchMove(e)
  }

  const shouldSuppressClick = (): boolean => {
    if (!suppressClickRef.current) return false
    suppressClickRef.current = false
    return true
  }

  return { isDragging, handlePointerDown, handlePointerMove, shouldSuppressClick }
}
