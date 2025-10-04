import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type MockInstance } from 'vitest'

import {
  fetchCrops,
  fetchRecommendations,
  renderApp,
  storageState,
} from '../utils/renderApp'
import {
  createItem,
  createRecommendResponse,
  defaultCrops,
  setupRecommendationsTest,
  toFullWidthAscii,
} from '../utils/recommendations'

describe('App recommendations / 検索フィルタ', () => {
  let useRecommendationsSpy: MockInstance

  beforeEach(async () => {
    ;({ useRecommendationsSpy } = await setupRecommendationsTest())
  })

  afterEach(() => {
    useRecommendationsSpy.mockRestore()
    cleanup()
  })

  it('検索ボックスで名前・カテゴリの部分一致フィルタとお気に入り優先を維持する', async () => {
    storageState.favorites = [4, 1]
    fetchCrops.mockResolvedValue(defaultCrops.map((crop) => ({ ...crop })))
    fetchRecommendations.mockResolvedValue(
      createRecommendResponse({
        items: [
          createItem({ crop: '春菊', sowing_week: '2024-W31', harvest_week: '2024-W40' }),
          createItem({ crop: 'にんじん', sowing_week: '2024-W32', harvest_week: '2024-W41' }),
          createItem({ crop: 'キャベツ', sowing_week: '2024-W33', harvest_week: '2024-W42' }),
          createItem({ crop: 'トルコギキョウ', sowing_week: '2024-W34', harvest_week: '2024-W43' }),
        ],
      }),
    )

    const { user } = await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenCalled()
    })

    const searchInput = await screen.findByRole('searchbox', { name: '作物検索' })
    const table = await screen.findByRole('table')

    const getBodyRows = () => within(table).getAllByRole('row').slice(1)

    await waitFor(() => {
      const rows = getBodyRows()
      const flowerIndex = rows.findIndex((row) => within(row).queryByText('トルコギキョウ'))
      const rootIndex = rows.findIndex((row) => within(row).queryByText('にんじん'))
      expect(flowerIndex).toBeGreaterThanOrEqual(0)
      expect(rootIndex).toBeGreaterThanOrEqual(0)
      expect(flowerIndex).toBeLessThan(rootIndex)
    })

    await user.type(searchInput, '菊')

    await waitFor(() => {
      const rows = getBodyRows()
      expect(rows).toHaveLength(1)
      expect(rows[0]).toHaveTextContent('春菊')
    })

    await user.clear(searchInput)
    await user.type(searchInput, 'LEA')

    await waitFor(() => {
      const rows = getBodyRows()
      expect(rows).toHaveLength(2)
      expect(rows[0]).toHaveTextContent('春菊')
      expect(rows[1]).toHaveTextContent('キャベツ')
    })

    await user.clear(searchInput)
    await user.type(searchInput, toFullWidthAscii('flower'))

    await waitFor(() => {
      const rows = getBodyRows()
      expect(rows).toHaveLength(1)
      expect(rows[0]).toHaveTextContent('トルコギキョウ')
    })
  })
})
