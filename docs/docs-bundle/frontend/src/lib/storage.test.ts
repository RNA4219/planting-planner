import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const CATEGORY_KEY = 'plantingPlanner.category'

const stubWindowWithStorage = (initial: Record<string, string> = {}) => {
  const store = new Map<string, string>(Object.entries(initial))
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }

  vi.stubGlobal('window', { localStorage: localStorageMock } as unknown as Window &
    typeof globalThis)
}

describe('loadSelectedCategory', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('保存済みの fruit は leaf にマイグレーションされる', async () => {
    stubWindowWithStorage({ [CATEGORY_KEY]: JSON.stringify('fruit') })
    const { loadSelectedCategory } = await import('./storage')

    expect(loadSelectedCategory()).toBe('leaf')
  })

  it('無効値のみ保存されている場合は leaf にフォールバックする', async () => {
    stubWindowWithStorage({ [CATEGORY_KEY]: JSON.stringify('unknown') })
    const { loadSelectedCategory } = await import('./storage')

    expect(loadSelectedCategory()).toBe('leaf')
  })
})
