import { expect } from '@playwright/test'
import { Given, Then, When } from './fixtures'
import { readScrollPosition, searchBox, timelineScroll } from './locators'

Given('ページを開く', async ({ page }) => {
  await page.goto('/')
})

When('ページをリロードする', async ({ page }) => {
  await page.reload()
})

When('{string}ボタンをクリックする', async ({ page }, name: string) => {
  await page.getByRole('button', { name }).click()
})

When('{string}ボタンを{int}回クリックする', async ({ page }, name: string, times: number) => {
  const button = page.getByRole('button', { name })
  for (let i = 0; i < times; i++) {
    await button.click()
  }
})

When('{string}を選択する', async ({ page }, name: string) => {
  await page.getByRole('button', { name }).click()
})

When('検索ボックスに{string}と入力する', async ({ page }, text: string) => {
  await searchBox(page).fill(text)
})

When('Enterキーを押す', async ({ page }) => {
  await page.keyboard.press('Enter')
})

Then('{string}というエントリが表示される', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name })).toBeVisible()
})

Then('{string}というエントリが表示されていない', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name })).toBeHidden()
})

Then('スクロール位置が変化する', async ({ page, ctx }) => {
  if (ctx.scrollBefore === null)
    throw new Error('scroll position was never recorded before the action')
  await expect(async () => {
    const after = await readScrollPosition(timelineScroll(page))
    expect(after).not.toEqual(ctx.scrollBefore)
  }).toPass()
})
