import { test as base, createBdd } from 'playwright-bdd'

type Ctx = {
  scrollBefore: { top: number; left: number } | null
  heights: Record<string, number>
}

export const test = base.extend<{ ctx: Ctx }>({
  ctx: async ({}, use) => {
    await use({ scrollBefore: null, heights: {} })
  },
})

export const { Given, When, Then, Before } = createBdd(test)
