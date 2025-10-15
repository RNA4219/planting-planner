const env = import.meta.env

const normalizeString = (value: string | undefined, fallback: string): string => {
  if (!value) {
    return fallback
  }
  return value
}

const normalizeBoolean = (value: string | boolean | undefined, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true
    }
    if (value === 'false') {
      return false
    }
  }

  return fallback
}

export const APP_VERSION = normalizeString(env.VITE_APP_VERSION, 'development')
export const SCHEMA_VERSION = normalizeString(env.VITE_SCHEMA_VERSION, 'unknown')
export const DATA_EPOCH = normalizeString(env.VITE_DATA_EPOCH, 'unknown')
export const SW_FORCE_UPDATE = normalizeBoolean(env.VITE_SW_FORCE_UPDATE, false)

export const buildTelemetryContext = () => ({
  appVersion: APP_VERSION,
  schemaVersion: SCHEMA_VERSION,
  dataEpoch: DATA_EPOCH,
})
