const normalizeBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'on', 'yes'].includes(normalized)) {
      return true
    }
    if (['0', 'false', 'off', 'no'].includes(normalized)) {
      return false
    }
  }
  return fallback
}

const readGlobalFlag = (name: string): unknown => {
  const globals = globalThis as {
    FEATURE_FLAGS?: Record<string, unknown>
    __APP_FEATURE_FLAGS__?: Record<string, unknown>
  }

  const primary = globals.FEATURE_FLAGS
  if (primary && name in primary) {
    return primary[name]
  }

  const legacy = globals.__APP_FEATURE_FLAGS__
  if (legacy && name in legacy) {
    return legacy[name]
  }

  return undefined
}

const readEnvFlag = (name: string): string | undefined => {
  const env = (import.meta.env ?? {}) as Record<string, string | undefined>
  return env[`VITE_FEATURE_${name}`]
}

export const isWeatherTabEnabled = (): boolean => {
  const defaultValue = true
  const globalValue = readGlobalFlag('WEATHER_TAB')
  if (typeof globalValue !== 'undefined') {
    return normalizeBoolean(globalValue, defaultValue)
  }
  const envValue = readEnvFlag('WEATHER_TAB')
  if (typeof envValue !== 'undefined') {
    return normalizeBoolean(envValue, defaultValue)
  }
  return defaultValue
}
