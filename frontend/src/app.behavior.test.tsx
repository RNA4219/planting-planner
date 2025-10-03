import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { UseRecommendationsSpy } from './app.test.helpers'

import {
  cropsFixture,
  defaultRecommendation,
  localItem,
  renderApp,
  resetAppTestState,
  fetchCrops,
  fetchRecommendations,
  saveFavorites,
  storageState,
  createUseRecommendationsSpy,
} from './app.test.helpers'

describe('App smoke behavior', () => {
  let restoreSpy: (() => void) | undefined
  let useRecommendationsSpy: UseRecommendationsSpy

  beforeEach(async () => {
    resetAppTestState()
    const { spy, restore } = await createUseRecommendationsSpy()
    useRecommendationsSpy = spy
    restoreSpy = restore
  })

  afterEach(() => {
    restoreSpy?.()
    cleanup()
  })

  it('保存済み地域を使って初回フェッチされる', async () => {
    storageState.region = 'cold'
    fetchCrops.mockResolvedValue(cropsFixture.slice(0, 2))
    fetchRecommendations.mockResolvedValue({
      ...defaultRecommendation,
      region: 'cold',
      items: [],
    })

    await renderApp()

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenCalledWith('cold', '2024-W30')
    })
    expect(useRecommendationsSpy).toHaveBeenCalled()
  })

  it('お気に入りトグルで保存内容が更新される', async () => {
    fetchCrops.mockResolvedValue(cropsFixture.slice(0, 2))
    fetchRecommendations.mockResolvedValue({
      ...defaultRecommendation,
      items: [
        { ...localItem, crop: '春菊' },
        localItem,
      ],
    })

    const { user } = await renderApp()

    await user.click(screen.getByRole('button', { name: 'この条件で見る' }))
    await user.click(screen.getByRole('button', { name: 'にんじんをお気に入りに追加' }))

    expect(saveFavorites).toHaveBeenLastCalledWith([2])
  })
})
