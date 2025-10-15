export type TelemetryPayload = Record<string, unknown>

type TelemetryClient = {
  readonly track?: (event: string, payload?: TelemetryPayload) => void
}

const getClient = (): TelemetryClient | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const candidate = (window as unknown as { appTelemetry?: TelemetryClient }).appTelemetry
  if (!candidate) {
    return null
  }
  return candidate
}

export const track = (event: string, payload?: TelemetryPayload) => {
  try {
    getClient()?.track?.(event, payload)
  } catch {
    // no-op
  }
}
