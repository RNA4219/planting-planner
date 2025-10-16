import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type MockedNavigator = Navigator & {
  serviceWorker: {
    register: ReturnType<typeof vi.fn>
    addEventListener: ReturnType<typeof vi.fn>
    controller?: unknown
  }
}

const trackMock = vi.fn()
const buildTelemetryContextMock = vi.fn(() => ({ context: 'mocked' }))

vi.mock('../telemetry', () => ({
  track: trackMock,
}))

vi.mock('../../config/pwa', () => ({
  buildTelemetryContext: buildTelemetryContextMock,
}))

describe('registerServiceWorker', () => {
  beforeEach(() => {
    vi.resetModules()
    trackMock.mockReset()
    buildTelemetryContextMock.mockReset()
    buildTelemetryContextMock.mockReturnValue({ context: 'mocked' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('records telemetry when service worker registration fails', async () => {
    const error = new Error('registration failed')
    const register = vi.fn(() => Promise.reject(error))
    const addEventListener = vi.fn()

    const navigatorMock: MockedNavigator = {
      onLine: true,
      serviceWorker: {
        register,
        addEventListener,
        controller: undefined,
      },
    } as unknown as MockedNavigator

    vi.stubGlobal('navigator', navigatorMock)
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
    })

    const { registerServiceWorker } = await import('../swClient')

    await registerServiceWorker()

    expect(register).toHaveBeenCalledWith('/sw.js')
    expect(trackMock).toHaveBeenCalledTimes(1)
    expect(trackMock).toHaveBeenCalledWith(
      'sw.register.failed',
      expect.objectContaining({
        error: error.message,
        telemetryContext: { context: 'mocked' },
      }),
    )
    expect(buildTelemetryContextMock).toHaveBeenCalledTimes(1)
  })
})
