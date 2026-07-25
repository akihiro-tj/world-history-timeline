import { expect } from '@playwright/test'
import { Then, When } from './fixtures'
import { readScrollPosition, timelineScroll } from './locators'

const DRAG_DISTANCE_PX = 120

When('年表をマウスでドラッグする', async ({ page, ctx }) => {
  const scroll = timelineScroll(page)
  ctx.scrollBefore = await readScrollPosition(scroll)
  const box = await scroll.boundingBox()
  if (!box) throw new Error('timeline scroll bounding box unavailable')
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX - DRAG_DISTANCE_PX, startY - DRAG_DISTANCE_PX, { steps: 10 })
  await page.mouse.up()
})

When('{string}の高さを記録する', async ({ page, ctx }, name: string) => {
  const height = await page.getByRole('button', { name }).getAttribute('height')
  if (height === null) throw new Error(`entry "${name}" has no height attribute`)
  ctx.heights[name] = Number(height)
})

Then('{string}の高さが記録した高さより高い', async ({ page, ctx }, name: string) => {
  const recorded = ctx.heights[name]
  if (recorded === undefined) throw new Error(`no recorded height for "${name}"`)
  const height = await page.getByRole('button', { name }).getAttribute('height')
  expect(Number(height)).toBeGreaterThan(recorded)
})

Then('{string}の高さが記録した高さより低い', async ({ page, ctx }, name: string) => {
  const recorded = ctx.heights[name]
  if (recorded === undefined) throw new Error(`no recorded height for "${name}"`)
  const height = await page.getByRole('button', { name }).getAttribute('height')
  expect(Number(height)).toBeLessThan(recorded)
})
