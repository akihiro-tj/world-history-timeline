import { expect } from '@playwright/test'
import { Then, When } from './fixtures'
import { detailPanel, readScrollPosition, timelineScroll } from './locators'

Then('年表の SVG が表示される', async ({ page }) => {
  await expect(page.getByRole('img', { name: '年表' })).toBeVisible()
})

Then('詳細パネルが画面の右側に表示される', async ({ page }) => {
  const box = await detailPanel(page).boundingBox()
  const viewport = page.viewportSize()
  if (!box || !viewport) throw new Error('detail panel bounding box or viewport size unavailable')
  expect(box.x).toBeGreaterThan(viewport.width / 2)
})

Then('詳細パネルが画面の下半分に表示される', async ({ page }) => {
  const box = await detailPanel(page).boundingBox()
  const viewport = page.viewportSize()
  if (!box || !viewport) throw new Error('detail panel bounding box or viewport size unavailable')
  expect(box.y).toBeGreaterThan(viewport.height / 2)
})

When('年表の上でマウスホイールを下方向に回す', async ({ page, ctx }) => {
  const scroll = timelineScroll(page)
  ctx.scrollBefore = await readScrollPosition(scroll)
  const box = await scroll.boundingBox()
  if (!box) throw new Error('timeline scroll bounding box unavailable')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, 800)
})

Then('{string}という国名見出しが表示される', async ({ page }, name: string) => {
  await expect(page.getByText(name, { exact: true })).toBeVisible()
})

Then('{string}という国名見出しが表示されていない', async ({ page }, name: string) => {
  await expect(page.getByText(name, { exact: true })).toBeHidden()
})
