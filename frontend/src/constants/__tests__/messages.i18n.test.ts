import { afterEach, afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const DEFAULT_URL = 'http://localhost/'
const ORIGINAL_LOCATION = window.location

const stubLocation = (href: string) => {
  const url = new URL(href)
  const stub = Object.assign(new URL(url.href), {
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn(),
  }) as unknown as Location
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: stub,
  })
}

const resetEnvironment = () => {
  delete (globalThis as { FEATURE_FLAGS?: unknown }).FEATURE_FLAGS
  vi.unstubAllEnvs()
  vi.resetModules()
  stubLocation(DEFAULT_URL)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = ''
  }
}

describe('messages internationalization', () => {
  beforeEach(() => {
    stubLocation(DEFAULT_URL)
  })

  afterEach(() => {
    resetEnvironment()
  })

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: ORIGINAL_LOCATION,
    })
  })

  it('returns English messages when lang=en and FEATURE_FLAGS.I18N_EN is enabled', async () => {
    globalThis.FEATURE_FLAGS = { I18N_EN: true }
    vi.stubEnv('VITE_I18N_EN', 'false')
    stubLocation('http://localhost/?lang=en')

    const { SEARCH_CONTROLS_TEXT } = await import('../messages')

    expect(SEARCH_CONTROLS_TEXT.searchPlaceholder).toBe('Search by crop name or category')
    expect(document.documentElement.lang).toBe('en')
  })

  it('returns English messages when lang=en and VITE_I18N_EN is enabled', async () => {
    vi.stubEnv('VITE_I18N_EN', 'true')
    stubLocation('http://localhost/?lang=en')

    const { SEARCH_CONTROLS_TEXT } = await import('../messages')

    expect(SEARCH_CONTROLS_TEXT.searchPlaceholder).toBe('Search by crop name or category')
    expect(document.documentElement.lang).toBe('en')
  })

  it('falls back to Japanese messages when English feature flag is disabled', async () => {
    vi.stubEnv('VITE_I18N_EN', 'false')
    stubLocation('http://localhost/?lang=en')

    const { SEARCH_CONTROLS_TEXT } = await import('../messages')

    expect(SEARCH_CONTROLS_TEXT.searchPlaceholder).toBe('作物名・カテゴリで検索')
    expect(document.documentElement.lang).toBe('ja')
  })
})
