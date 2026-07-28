import { expect } from '@playwright/test'
import { Then, When } from './fixtures'
import { contemporariesList, detailPanel } from './locators'

Then('詳細パネルの見出しが{string}である', async ({ page }, title: string) => {
  await expect(detailPanel(page).getByRole('heading', { name: title })).toBeVisible()
})

Then('詳細パネルに{string}が表示される', async ({ page }, text: string) => {
  await expect(detailPanel(page).getByText(text)).toBeVisible()
})

Then('同時代の一覧に{string}が含まれる', async ({ page }, name: string) => {
  await expect(contemporariesList(page).getByRole('button', { name })).toBeVisible()
})

When('同時代の一覧から{string}を選択する', async ({ page }, name: string) => {
  await contemporariesList(page).getByRole('button', { name }).click()
})
