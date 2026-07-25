import { expect } from '@playwright/test'
import { Given, Then, When } from './fixtures'

const THEME_TOGGLE_NAME = /モードに切り替え/

Given('ブラウザのカラースキームをダークに設定する', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
})

When('テーマ切り替えボタンをクリックする', async ({ page }) => {
  await page.getByRole('button', { name: THEME_TOGGLE_NAME }).click()
})

Then('ダークテーマになっている', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'dark')
})
