import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type LocaleArg =
  | ConstructorParameters<typeof Intl.NumberFormat>[0]
  | ConstructorParameters<typeof Intl.DateTimeFormat>[0]

const DEFAULT_URL = 'http://localhost/'
const ORIGINAL_LOCATION = window.location
const ORIGINAL_NAVIGATOR = { language: navigator.language, languages: navigator.languages }

const extractLocale = (value: LocaleArg) =>
  typeof value === 'string' ? value : Array.isArray(value) ? (value[0] ?? '') : ''

const stubLocation = (href: string) => {
  const url = new URL(href)
  const stub = Object.assign(new URL(url.href), {
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn(),
  }) as unknown as Location
  Object.defineProperty(window, 'location', { configurable: true, value: stub })
}

const applyNavigatorLocales = (locales: readonly string[], language: string) => {
  Object.defineProperty(window.navigator, 'languages', { configurable: true, value: locales })
  Object.defineProperty(window.navigator, 'language', { configurable: true, value: language })
}

const resetEnvironment = () => {
  vi.resetModules()
  vi.restoreAllMocks()
  delete (globalThis as { FEATURE_FLAGS?: unknown }).FEATURE_FLAGS
  stubLocation(DEFAULT_URL)
  document.documentElement.lang = 'ja'
  applyNavigatorLocales(ORIGINAL_NAVIGATOR.languages, ORIGINAL_NAVIGATOR.language)
}

const importWeatherTab = async (flag: boolean, locales: readonly string[], language: string) => {
  stubLocation('http://localhost/?lang=en')
  ;(globalThis as { FEATURE_FLAGS?: { I18N_EN?: boolean } }).FEATURE_FLAGS = { I18N_EN: flag }
  applyNavigatorLocales(locales, language)
  const numberFormatSpy = vi.spyOn(Intl, 'NumberFormat')
  const dateTimeFormatSpy = vi.spyOn(Intl, 'DateTimeFormat')
  await import('../WeatherTab')
  return {
    numberLocale: extractLocale(numberFormatSpy.mock.calls[0]?.[0]),
    dateLocale: extractLocale(dateTimeFormatSpy.mock.calls[0]?.[0]),
  }
}

describe('WeatherTab locale resolution', () => {
  beforeEach(resetEnvironment)

  afterEach(resetEnvironment)

  afterAll(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: ORIGINAL_LOCATION })
  })

  it('英語フラグ有効時に英語ロケールを使用する', async () => {
    const { numberLocale, dateLocale } = await importWeatherTab(true, ['en-GB', 'en'], 'en-GB')
    expect(numberLocale.toLowerCase().startsWith('en')).toBe(true)
    expect(dateLocale.toLowerCase().startsWith('en')).toBe(true)
  })

  it('英語フラグ無効時は日本語ロケールへフォールバックする', async () => {
    const { numberLocale, dateLocale } = await importWeatherTab(false, ['en-US'], 'en-US')
    expect(numberLocale).toBe('ja-JP')
    expect(dateLocale).toBe('ja-JP')
  })
})
