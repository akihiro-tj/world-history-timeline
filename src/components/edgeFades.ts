const EDGE_EPSILON_PX = 2

export type EdgeFades = {
  top: boolean
  bottom: boolean
  left: boolean
  right: boolean
}

type ScrollMetrics = {
  scrollTop: number
  scrollLeft: number
  scrollHeight: number
  scrollWidth: number
  clientHeight: number
  clientWidth: number
}

export function computeEdgeFades(metrics: ScrollMetrics): EdgeFades {
  return {
    top: metrics.scrollTop > EDGE_EPSILON_PX,
    bottom: metrics.scrollTop < metrics.scrollHeight - metrics.clientHeight - EDGE_EPSILON_PX,
    left: metrics.scrollLeft > EDGE_EPSILON_PX,
    right: metrics.scrollLeft < metrics.scrollWidth - metrics.clientWidth - EDGE_EPSILON_PX,
  }
}
