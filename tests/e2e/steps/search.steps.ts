import { When } from './fixtures'

When('検索候補から{string}を選択する', async ({ page }, name: string) => {
  await page.getByRole('option', { name }).click()
})
