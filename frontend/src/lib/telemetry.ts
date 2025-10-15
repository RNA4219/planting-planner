import { buildTelemetryContext } from '../config/pwa'

type TelemetryPayload = Record<string, unknown>

const TELEMETRY_ENDPOINT = '/api/telemetry'

const createRequestBody = (
  event: string,
  payload: TelemetryPayload,
  requestId: string | undefined,
): string => {
  const context = buildTelemetryContext()
  return JSON.stringify({
    event,
    requestId,
    ...context,
    payload,
    timestamp: new Date().toISOString(),
  })
}

const sendWithBeacon = (body: string): boolean => {
  const beacon = globalThis.navigator?.sendBeacon?.bind(globalThis.navigator)
  if (!beacon) {
    return false
  }
  const blob = new Blob([body], { type: 'application/json' })
  return beacon(TELEMETRY_ENDPOINT, blob)
}

const sendWithFetch = async (body: string) => {
  await fetch(TELEMETRY_ENDPOINT, {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
    },
    keepalive: true,
  })
}

export const sendTelemetry = async (
  event: string,
  payload: TelemetryPayload = {},
  requestId?: string,
): Promise<void> => {
  const body = createRequestBody(event, payload, requestId)

  try {
    const sent = sendWithBeacon(body)
    if (sent) {
      return
    }
  } catch {
    // Beacon failures should fall through to fetch.
  }

  try {
    await sendWithFetch(body)
  } catch {
    // Telemetry failures should not break the main flow.
  }
}

export const track = sendTelemetry
