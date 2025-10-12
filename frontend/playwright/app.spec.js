import { expect, test } from '@playwright/test'

test('トップページが表示される', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
  expect(response?.ok()).toBe(true)
  await expect(page.getByRole('heading', { level: 1, name: 'Planting Planner' })).toBeVisible()
})
