import { expect } from '@playwright/test'
import { Then } from './fixtures'
import { onboardingDialog } from './locators'

Then('オンボーディングが表示される', async ({ page }) => {
  await expect(onboardingDialog(page)).toBeVisible()
})

Then('オンボーディングが表示されない', async ({ page }) => {
  await expect(onboardingDialog(page)).toBeHidden()
})
