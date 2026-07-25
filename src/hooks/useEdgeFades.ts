import { useCallback, useState } from 'react'
import { computeEdgeFades, type EdgeFades } from '../components/edgeFades'

export function useEdgeFades() {
  const [edgeFades, setEdgeFades] = useState<EdgeFades>({
    top: false,
    bottom: false,
    left: false,
    right: false,
  })

  const updateEdgeFades = useCallback((container: HTMLDivElement) => {
    setEdgeFades((prev) => {
      const next = computeEdgeFades(container)
      return prev.top === next.top &&
        prev.bottom === next.bottom &&
        prev.left === next.left &&
        prev.right === next.right
        ? prev
        : next
    })
  }, [])

  return { edgeFades, updateEdgeFades }
}
