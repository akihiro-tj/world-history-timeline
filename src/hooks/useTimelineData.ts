import { useCallback, useEffect, useState } from 'react'
import type { DatasetError } from '../data/load'
import { fetchDataset } from '../data/load'
import type { Dataset } from '../data/schema'

type State =
  | { status: 'loading' }
  | { status: 'ready'; dataset: Dataset }
  | { status: 'error'; error: DatasetError }

export function useTimelineData() {
  const [state, setState] = useState<State>({ status: 'loading' })

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    fetchDataset().then((result) => {
      if (result.ok) {
        setState({ status: 'ready', dataset: result.value })
        return
      }
      console.error('failed to load dataset', result.error)
      setState({ status: 'error', error: result.error })
    })
  }, [])

  useEffect(reload, [reload])

  return {
    status: state.status,
    dataset: state.status === 'ready' ? state.dataset : undefined,
    reload,
  }
}
