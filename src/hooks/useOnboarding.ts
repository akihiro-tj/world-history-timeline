import { useCallback, useState } from 'react'
import { hasSeenOnboarding, markOnboardingSeen } from '../components/onboardingStorage'

export function useOnboarding() {
  const [isHelpOpen, setIsHelpOpen] = useState(() => !hasSeenOnboarding())

  const openHelp = useCallback(() => {
    setIsHelpOpen(true)
  }, [])

  const closeHelp = useCallback(() => {
    markOnboardingSeen()
    setIsHelpOpen(false)
  }, [])

  return { isHelpOpen, openHelp, closeHelp }
}
