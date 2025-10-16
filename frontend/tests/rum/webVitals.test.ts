import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

type WebVitalsMetric = {
  id: string
  value: number
  delta: number
  rating?: string
}

type WebVitalsListener = (metric: WebVitalsMetric) => void

const mocks = vi.hoisted(() => {
  const trackSpy = vi.fn()

  let lcpListener: WebVitalsListener | undefined
  let inpListener: WebVitalsListener | undefined
  let clsListener: WebVitalsListener | undefined

  const onLCPSpy = vi.fn((listener: WebVitalsListener) => {
    lcpListener = listener
  })
  const onINPSpy = vi.fn((listener: WebVitalsListener) => {
    inpListener = listener
  })
  const onCLSSpy = vi.fn((listener: WebVitalsListener) => {
    clsListener = listener
  })

  return {
    trackSpy,
    onLCPSpy,
    onINPSpy,
    onCLSSpy,
    getListeners: () => ({ lcpListener, inpListener, clsListener }),
    reset: () => {
      trackSpy.mockClear()
      onLCPSpy.mockClear()
      onINPSpy.mockClear()
      onCLSSpy.mockClear()
      lcpListener = undefined
      inpListener = undefined
      clsListener = undefined
    },
  }
})

const originalRequestIdleCallback =
  (globalThis as typeof globalThis & {
    requestIdleCallback?: typeof window.requestIdleCallback
  }).requestIdleCallback

vi.mock('../../src/lib/telemetry', () => ({
  track: mocks.trackSpy,
}))

vi.mock('web-vitals', () => ({
  onLCP: mocks.onLCPSpy,
  onINP: mocks.onINPSpy,
  onCLS: mocks.onCLSSpy,
}))

// eslint-disable-next-line import/first
import { startWebVitalsTracking } from '../../src/lib/webVitals'

describe('startWebVitalsTracking', () => {
  beforeEach(() => {
    mocks.reset()
    ;(globalThis as typeof globalThis & {
      requestIdleCallback?: typeof window.requestIdleCallback
    }).requestIdleCallback = vi
      .fn<Parameters<typeof window.requestIdleCallback>[0], number>((callback) => {
        callback({
          didTimeout: false,
          timeRemaining: () => 0,
        })
        return 0
      })
  })

  afterEach(() => {
    if (originalRequestIdleCallback) {
      ;(globalThis as typeof globalThis & {
        requestIdleCallback?: typeof window.requestIdleCallback
      }).requestIdleCallback = originalRequestIdleCallback
    } else {
      delete (globalThis as typeof globalThis & {
        requestIdleCallback?: typeof window.requestIdleCallback
      }).requestIdleCallback
    }
  })

  it('registers listeners lazily and forwards metrics to telemetry', async () => {
    const registration = startWebVitalsTracking()

    const { requestIdleCallback } = globalThis as typeof globalThis & {
      requestIdleCallback?: ReturnType<typeof vi.fn>
    }

    expect(requestIdleCallback).toHaveBeenCalledTimes(1)
    await registration

    expect(mocks.onLCPSpy).toHaveBeenCalledTimes(1)
    expect(mocks.onLCPSpy).toHaveBeenCalledWith(expect.any(Function))
    expect(mocks.onINPSpy).toHaveBeenCalledTimes(1)
    expect(mocks.onINPSpy).toHaveBeenCalledWith(expect.any(Function))
    expect(mocks.onCLSSpy).toHaveBeenCalledTimes(1)
    expect(mocks.onCLSSpy).toHaveBeenCalledWith(expect.any(Function))

    const { lcpListener, inpListener, clsListener } = mocks.getListeners()

    if (!lcpListener || !inpListener || !clsListener) {
      throw new Error('web vitals listeners were not registered')
    }

    const lcpMetric: WebVitalsMetric = {
      id: 'lcp-id',
      value: 2500,
      delta: 2500,
      rating: 'good',
    }
    lcpListener(lcpMetric)

    expect(mocks.trackSpy).toHaveBeenNthCalledWith(1, 'web_vitals.lcp', {
      id: 'lcp-id',
      value: 2500,
      delta: 2500,
      rating: 'good',
    })

    const inpMetric: WebVitalsMetric = {
      id: 'inp-id',
      value: 180,
      delta: 180,
      rating: 'needs-improvement',
    }
    inpListener(inpMetric)

    expect(mocks.trackSpy).toHaveBeenNthCalledWith(2, 'web_vitals.inp', {
      id: 'inp-id',
      value: 180,
      delta: 180,
      rating: 'needs-improvement',
    })

    const clsMetric: WebVitalsMetric = {
      id: 'cls-id',
      value: 0.15,
      delta: 0.1,
    }
    clsListener(clsMetric)

    expect(mocks.trackSpy).toHaveBeenNthCalledWith(3, 'web_vitals.cls', {
      id: 'cls-id',
      value: 0.15,
      delta: 0.1,
    })
  })
})
