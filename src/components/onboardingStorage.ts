const STORAGE_KEY = 'whtl:onboarding:v1'
const SEEN_VALUE = 'done'

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === SEEN_VALUE
  } catch {
    return true
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, SEEN_VALUE)
  } catch {
    // ストレージ不可の環境では毎回表示を避けるため何もしない
  }
}
