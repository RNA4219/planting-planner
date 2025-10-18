import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { isWeatherTabEnabled } from '../../src/config/featureFlags'

const originalEnv = { ...(import.meta.env ?? {}) } as Record<string, string | undefined>
const originalProcessEnvWeatherTab = process.env.VITE_FEATURE_WEATHER_TAB
const originalFeatureFlags = (
  globalThis as {
    FEATURE_FLAGS?: Record<string, unknown>
  }
).FEATURE_FLAGS

const setImportMetaEnv = (env: Record<string, string | undefined>): void => {
  Object.defineProperty(import.meta, 'env', {
    value: env,
    configurable: true,
    writable: true,
  })
}

describe('isWeatherTabEnabled', () => {
  beforeEach(() => {
    const globals = globalThis as {
      FEATURE_FLAGS?: Record<string, unknown>
      __APP_FEATURE_FLAGS__?: Record<string, unknown>
    }
    if (typeof originalFeatureFlags === 'undefined') {
      delete globals.FEATURE_FLAGS
    } else {
      globals.FEATURE_FLAGS = originalFeatureFlags
    }
    delete globals.__APP_FEATURE_FLAGS__
    const envCopy = { ...originalEnv }
    delete envCopy.VITE_FEATURE_WEATHER_TAB
    setImportMetaEnv(envCopy)
    delete process.env.VITE_FEATURE_WEATHER_TAB
  })

  afterEach(() => {
    const globals = globalThis as {
      FEATURE_FLAGS?: Record<string, unknown>
      __APP_FEATURE_FLAGS__?: Record<string, unknown>
    }
    if (typeof originalFeatureFlags === 'undefined') {
      delete globals.FEATURE_FLAGS
    } else {
      globals.FEATURE_FLAGS = originalFeatureFlags
    }
    delete globals.__APP_FEATURE_FLAGS__
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

  it('FEATURE_FLAGS で天気タブの有効・無効を切り替えられる', () => {
    const globals = globalThis as { FEATURE_FLAGS?: Record<string, boolean> }

    globals.FEATURE_FLAGS = { WEATHER_TAB: false }
    expect(isWeatherTabEnabled()).toBe(false)

    globals.FEATURE_FLAGS = { WEATHER_TAB: true }
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
