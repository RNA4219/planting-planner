import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

type StoreModule = typeof import('./store')

const importStore = async (): Promise<StoreModule> => {
  return import('./store')
}

let storageKey: string

beforeAll(async () => {
  const { RECOMMENDATION_PREFERENCES_KEY } = await importStore()
  storageKey = RECOMMENDATION_PREFERENCES_KEY
})

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
})

describe('recommendation preferences store', () => {
  it('初期状態がエクスポートされたデフォルト値と一致する', async () => {
    const { DEFAULT_RECOMMENDATION_PREFERENCES, useRecommendationStore } = await importStore()

    expect(useRecommendationStore.getState()).toMatchObject(DEFAULT_RECOMMENDATION_PREFERENCES)
  })

  it('localStorage から値をハイドレートする', async () => {
    const savedState = {
      region: 'warm' as const,
      selectedMarket: 'city:kyoto' as const,
      selectedCategory: 'flower' as const,
    }
    localStorage.setItem(storageKey, JSON.stringify({ state: savedState, version: 1 }))

    const { useRecommendationStore } = await importStore()

    expect(useRecommendationStore.getState()).toMatchObject(savedState)
  })

  it('setter 呼び出し時に localStorage へ保存する', async () => {
    const { useRecommendationStore } = await importStore()

    useRecommendationStore.getState().setRegion('warm')
    useRecommendationStore.getState().setSelectedMarket('city:osaka')
    useRecommendationStore.getState().setSelectedCategory('flower')

    expect(JSON.parse(localStorage.getItem(storageKey) ?? '{}')).toMatchObject({
      state: {
        region: 'warm',
        selectedMarket: 'city:osaka',
        selectedCategory: 'flower',
      },
    })
  })
})
