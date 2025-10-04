import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type MockInstance } from 'vitest'

import {
  fetchCrops,
  fetchRecommend,
  fetchRecommendations,
  renderApp,
  resetAppSpies,
  storageState,
} from '../utils/renderApp'
import {
  createRecommendResponse,
  createSearchFilterFixtures,
  setupRecommendationsTest,
} from '../utils/recommendations'

describe('App recommendations / 検索フィルタ', () => {
  let useRecommendationsSpy: MockInstance

  beforeEach(async () => {
    resetAppSpies()
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    ;({ useRecommendationsSpy } = await setupRecommendationsTest())
  })

  afterEach(() => {
    cleanup()
    useRecommendationsSpy.mockRestore()
    resetAppSpies()
  })

  it('名前・カテゴリ・正規化・大文字小文字・お気に入り優先が検索に反映される', async () => {
    const fixtures = createSearchFilterFixtures()
    storageState.favorites = [...fixtures.favorites]
    fetchCrops.mockResolvedValue(fixtures.crops)
    fetchRecommendations.mockResolvedValue(
      createRecommendResponse({ items: fixtures.items }),
    )

    const { user } = await renderApp()

    const table = await screen.findByRole('table')
    const searchInput = screen.getByRole('searchbox', { name: '作物検索' })

    await waitFor(() => {
      fixtures.items.forEach((item) => {
        expect(table).toHaveTextContent(item.crop)
      })
    })

    const expectRows = async (names: string[]) => {
      await waitFor(() => {
        const rows = within(table).getAllByRole('row').slice(1)
        expect(rows).toHaveLength(names.length)
        rows.forEach((row, index) => {
          expect(row).toHaveTextContent(names[index] ?? '')
        })
      })
    }

    await user.clear(searchInput)
    await user.type(searchInput, fixtures.queries.name)
    await expectRows(['春菊'])

    await user.clear(searchInput)
    await user.type(searchInput, fixtures.queries.category)
    await expectRows(['コスモス'])

    await user.clear(searchInput)
    await user.type(searchInput, fixtures.queries.nfkc)
    await expectRows(['ミツバ'])

    await user.clear(searchInput)
    await user.type(searchInput, fixtures.queries.caseInsensitive)
    await expectRows(['Basil'])

    await user.clear(searchInput)
    await user.type(searchInput, fixtures.queries.favoriteCategory)
    await expectRows(fixtures.expected.favoriteOrder)
  })
})
