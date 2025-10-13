const { expect, test } = await import('@playwright/test')
import type { Route } from '@playwright/test'

const CROPS = [
  { id: 1, name: '春菊', category: 'leaf' },
  { id: 2, name: '江戸川小松菜', category: 'leaf' },
  { id: 3, name: 'にんじん', category: 'root' },
  { id: 4, name: 'バラ', category: 'flower' },
] as const

const RECOMMENDATIONS: Record<string, Record<string, unknown[]>> = {
  national: {
    leaf: [
      { crop: '春菊', sowing_week: '2024-W30', harvest_week: '2024-W35', source: '全国統計', growth_days: 42 },
    ],
    flower: [
      { crop: 'バラ', sowing_week: '2024-W28', harvest_week: '2024-W34', source: '全国統計', growth_days: 60 },
    ],
  },
  'city:tokyo': {
    leaf: [
      {
        crop: '江戸川小松菜',
        sowing_week: '2024-W29',
        harvest_week: '2024-W33',
        source: '東京都中央卸売市場',
        growth_days: 35,
      },
    ],
  },
}

const fulfillJson = (route: Route, data: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })

test.describe('市場トグルとカテゴリ遷移', () => {
  test('都市別切替とフォールバック表示を行う', async ({ page }) => {
    const recommendRequests: Array<Record<string, string>> = []

    await page.route('**/api/crops', (route) => fulfillJson(route, CROPS))
    await page.route('**/api/recommend?**', async (route) => {
      const url = new URL(route.request().url())
      const params = Object.fromEntries(url.searchParams.entries())
      recommendRequests.push(params)
      const scope = params.marketScope ?? 'national'
      const category = params.category ?? 'leaf'
      const items = RECOMMENDATIONS[scope]?.[category]
      if (items) {
        await fulfillJson(route, { week: '2024-W30', region: 'temperate', items })
        return
      }

      const fallbackItems = RECOMMENDATIONS.national?.[category]
      if (fallbackItems) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            fallback: 'true',
            'access-control-expose-headers': 'fallback',
          },
          body: JSON.stringify({ week: '2024-W30', region: 'temperate', items: fallbackItems }),
        })
        return
      }

      await fulfillJson(route, { error: 'not_found' }, 404)
    })
    await page.route('**/api/price?**', (route) =>
      fulfillJson(route, { crop_id: 1, crop: '春菊', unit: 'kg', source: 'mock', prices: [] }),
    )

    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Planting Planner' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '葉菜' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('row', { name: /春菊/ })).toBeVisible()

    const marketSelect = page.getByRole('combobox', { name: '市場' })
    await expect(marketSelect).toHaveValue('national')
    await marketSelect.selectOption('city:tokyo')
    await expect(marketSelect).toHaveValue('city:tokyo')
    await expect(page.getByRole('row', { name: /江戸川小松菜/ })).toBeVisible()

    const flowerTab = page.getByRole('tab', { name: '花き' })
    await flowerTab.click()
    const fallbackNotice = page.getByTestId('market-fallback-notice')
    await expect(fallbackNotice).toBeVisible()
    await expect(fallbackNotice).toHaveText(
      '市場データが一時的に利用できないため、推定値を表示しています。',
    )
    await expect(page.getByRole('row', { name: /バラ/ })).toBeVisible()
    expect.soft(recommendRequests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
        expect.objectContaining({ marketScope: 'city:tokyo', category: 'leaf' }),
        expect.objectContaining({ marketScope: 'city:tokyo', category: 'flower' }),
      ]),
    )
  })
})
