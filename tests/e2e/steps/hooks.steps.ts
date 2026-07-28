import { Before } from './fixtures'

// Why: the welcome overlay covers the whole screen and would block every other
// scenario's interactions, so it's pre-dismissed everywhere except the scenario
// that specifically tests the onboarding flow.
const ONBOARDING_STORAGE_KEY = 'whtl:onboarding:v1'
const ONBOARDING_SEEN_VALUE = 'done'

Before({ tags: 'not @onboarding' }, async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value)
    },
    { key: ONBOARDING_STORAGE_KEY, value: ONBOARDING_SEEN_VALUE },
  )
})
