import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { isWeatherTabEnabled } from '../../src/config/featureFlags'

const originalEnv = { ...(import.meta.env ?? {}) } as Record<string, string | undefined>
const originalProcessEnvWeatherTab = process.env.VITE_FEATURE_WEATHER_TAB

const setImportMetaEnv = (env: Record<string, string | undefined>): void => {
  Object.defineProperty(import.meta, 'env', {
    value: env,
    configurable: true,
    writable: true,
  })
}

describe('isWeatherTabEnabled', () => {
  beforeEach(() => {
    delete (globalThis as { __APP_FEATURE_FLAGS__?: Record<string, unknown> }).__APP_FEATURE_FLAGS__
    const envCopy = { ...originalEnv }
    delete envCopy.VITE_FEATURE_WEATHER_TAB
    setImportMetaEnv(envCopy)
    delete process.env.VITE_FEATURE_WEATHER_TAB
  })

  afterEach(() => {
    delete (globalThis as { __APP_FEATURE_FLAGS__?: Record<string, unknown> }).__APP_FEATURE_FLAGS__
    setImportMetaEnv({ ...originalEnv })
    if (typeof originalProcessEnvWeatherTab === 'undefined') {
      delete process.env.VITE_FEATURE_WEATHER_TAB
    } else {
      process.env.VITE_FEATURE_WEATHER_TAB = originalProcessEnvWeatherTab
    }
  })

  it('未設定の場合は天気タブを有効化する', () => {
    expect(isWeatherTabEnabled()).toBe(true)
  })

  it('グローバル設定で天気タブの有効・無効を切り替えられる', () => {
    const globals = globalThis as { __APP_FEATURE_FLAGS__?: Record<string, boolean> }

    globals.__APP_FEATURE_FLAGS__ = { WEATHER_TAB: false }
    expect(isWeatherTabEnabled()).toBe(false)

    globals.__APP_FEATURE_FLAGS__ = { WEATHER_TAB: true }
    expect(isWeatherTabEnabled()).toBe(true)
  })

  it('環境変数で天気タブの有効・無効を切り替えられる', () => {
    const baseEnv = {
      ...(import.meta.env as unknown as Record<string, string | undefined>),
    }

    setImportMetaEnv({ ...baseEnv, VITE_FEATURE_WEATHER_TAB: 'false' })
    process.env.VITE_FEATURE_WEATHER_TAB = 'false'
    expect(isWeatherTabEnabled()).toBe(false)

    setImportMetaEnv({ ...baseEnv, VITE_FEATURE_WEATHER_TAB: 'true' })
    process.env.VITE_FEATURE_WEATHER_TAB = 'true'
    expect(isWeatherTabEnabled()).toBe(true)
  })
})
