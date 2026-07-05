import { useCallback, useEffect, useState } from 'react'
import { fetchDataset } from '../data/load'
import type { Dataset } from '../data/schema'

type State = { status: 'loading' } | { status: 'ready'; dataset: Dataset } | { status: 'error' }

export function useTimelineData() {
  const [state, setState] = useState<State>({ status: 'loading' })

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    fetchDataset().then(
      (dataset) => setState({ status: 'ready', dataset }),
      () => setState({ status: 'error' }),
    )
  }, [])

  useEffect(reload, [reload])

  return {
    status: state.status,
    dataset: state.status === 'ready' ? state.dataset : undefined,
    reload,
  }
}
