const { expect, test } = await import('@playwright/test')
import type { Route } from '@playwright/test'

const CROPS = [
  { id: 1, name: '春菊', category: 'leaf' },
  { id: 2, name: '島しゅんぎく', category: 'leaf' },
  { id: 3, name: 'さつまいも', category: 'root' },
] as const

const RECOMMENDATION_RESPONSES: Record<
  string,
  { week: string; items: Array<Record<string, unknown>>; fallback?: boolean }
> = {
  'temperate|national|leaf': {
    week: '2024-W32',
    items: [
      {
        crop: '春菊',
        sowing_week: '2024-W30',
        harvest_week: '2024-W34',
        source: '全国統計',
        growth_days: 42,
      },
    ],
  },
  'warm|national|leaf': {
    week: '2024-W40',
    items: [
      {
        crop: '島しゅんぎく',
        sowing_week: '2024-W38',
        harvest_week: '2024-W42',
        source: '暖地推計',
        growth_days: 36,
      },
    ],
  },
  'warm|national|root': {
    week: '2024-W40',
    fallback: true,
    items: [
      {
        crop: 'さつまいも',
        sowing_week: '2024-W25',
        harvest_week: '2024-W43',
        source: '全国統計',
        growth_days: 120,
      },
    ],
  },
}

const fulfillJson = (route: Route, data: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })

const resolveRecommendationKey = (params: URLSearchParams) => {
  const region = params.get('region') ?? 'temperate'
  const marketScope = params.get('marketScope') ?? 'national'
  const category = params.get('category') ?? 'leaf'
  return { key: `${region}|${marketScope}|${category}`, region }
}

test.describe('検索条件送信とカテゴリ切替', () => {
  test('週と地域を更新後、カテゴリ切替でフォールバックを検知する', async ({ page }) => {
    const recommendRequests: Array<{ params: Record<string, string>; isFallback: boolean }> = []

    await page.route('**/api/crops', (route) => fulfillJson(route, CROPS))
    await page.route('**/api/recommend?**', async (route) => {
      const url = new URL(route.request().url())
      const params = url.searchParams
      const { key, region } = resolveRecommendationKey(params)
      const response = RECOMMENDATION_RESPONSES[key]
      const serializedParams = Object.fromEntries(params.entries())

      if (!response) {
        recommendRequests.push({ params: serializedParams, isFallback: false })
        await fulfillJson(route, { week: '2024-W30', region, items: [] }, 404)
        return
      }

      recommendRequests.push({ params: serializedParams, isFallback: Boolean(response.fallback) })

      if (response.fallback) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            fallback: 'true',
            'access-control-expose-headers': 'fallback',
          },
          body: JSON.stringify({ week: response.week, region, items: response.items }),
        })
        return
      }

      await fulfillJson(route, { week: response.week, region, items: response.items })
    })

    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Planting Planner' })).toBeVisible()
    await expect(page.getByRole('row', { name: /春菊/ })).toBeVisible()

    const weekInput = page.getByRole('textbox', { name: '週' })
    await weekInput.fill('2024-W40')
    await expect(weekInput).toHaveValue('2024-W40')

    const regionSelect = page.getByRole('combobox', { name: '地域' })
    await regionSelect.selectOption('warm')
    await expect(regionSelect).toHaveValue('warm')

    await page.getByRole('button', { name: 'この条件で見る' }).click()

    await expect(page.getByRole('row', { name: /島しゅんぎく/ })).toBeVisible()

    const rootTab = page.getByRole('tab', { name: '根菜' })
    await rootTab.click()

    const fallbackNotice = page.getByTestId('market-fallback-notice')
    await expect(fallbackNotice).toBeVisible()
    await expect(fallbackNotice).toHaveText(
      '市場データが一時的に利用できないため、推定値を表示しています。',
    )
    await expect(page.getByRole('row', { name: /さつまいも/ })).toBeVisible()

    expect.soft(recommendRequests).toHaveLength(4)
    expect.soft(recommendRequests[0]).toMatchObject({
      params: {
        region: 'temperate',
        marketScope: 'national',
        category: 'leaf',
      },
      isFallback: false,
    })
    expect
      .soft(
        recommendRequests
          .slice(1, -1)
          .some(
            (request) =>
              request.params.region === 'warm' &&
              request.params.marketScope === 'national' &&
              request.params.category === 'leaf',
          ),
      )
      .toBe(true)
    expect.soft(recommendRequests.at(-1)).toMatchObject({
      params: {
        region: 'warm',
        marketScope: 'national',
        category: 'root',
        week: '2024-W40',
      },
      isFallback: true,
    })
  })
})
