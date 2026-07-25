import type { KeyboardEvent } from 'react'

export function handleActivationKeyDown(
  event: KeyboardEvent<Element>,
  onActivate: () => void,
): void {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  onActivate()
}
