import type { Locator, Page } from '@playwright/test'

export function timelineScroll(page: Page): Locator {
  return page.getByTestId('timeline-scroll')
}

export function detailPanel(page: Page): Locator {
  return page.getByRole('complementary', { name: '詳細' })
}

export function contemporariesList(page: Page): Locator {
  return page.getByRole('list', { name: '同時代' })
}

export function searchBox(page: Page): Locator {
  return page.getByRole('searchbox', { name: '検索' })
}

export function onboardingDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'つかいかた' })
}

export async function readScrollPosition(scroll: Locator): Promise<{ top: number; left: number }> {
  return scroll.evaluate((el) => ({ top: el.scrollTop, left: el.scrollLeft }))
}
