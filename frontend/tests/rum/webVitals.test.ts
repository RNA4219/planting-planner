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

const originalRequestIdleCallback = (
  globalThis as typeof globalThis & {
    requestIdleCallback?: typeof window.requestIdleCallback
  }
).requestIdleCallback

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
  let originalRequestIdleCallback: typeof globalThis.requestIdleCallback

  const emitMetrics = () => {
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
  }

  beforeEach(() => {
    mocks.reset()
    originalRequestIdleCallback = globalThis.requestIdleCallback
    delete (globalThis as { requestIdleCallback?: typeof globalThis.requestIdleCallback })
      .requestIdleCallback
  })

  afterEach(() => {
    if (originalRequestIdleCallback) {
      vi.stubGlobal('requestIdleCallback', originalRequestIdleCallback)
    } else {
      delete (globalThis as { requestIdleCallback?: typeof globalThis.requestIdleCallback })
        .requestIdleCallback
    }
  })

  it('defers listener registration to requestIdleCallback when available', async () => {
    const idleCallbacks: IdleRequestCallback[] = []
    const idleCallbackMock = vi.fn((callback: IdleRequestCallback) => {
      idleCallbacks.push(callback)
      return idleCallbacks.length
    })
    vi.stubGlobal('requestIdleCallback', idleCallbackMock)

    startWebVitalsTracking()

    expect(idleCallbackMock).toHaveBeenCalledTimes(1)
    expect(mocks.onLCPSpy).not.toHaveBeenCalled()
    expect(mocks.onINPSpy).not.toHaveBeenCalled()
    expect(mocks.onCLSSpy).not.toHaveBeenCalled()

    idleCallbacks.forEach((callback) => callback({ didTimeout: false, timeRemaining: () => 50 }))

    await Promise.resolve()
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })

    expect(mocks.onLCPSpy).toHaveBeenCalledTimes(1)
    expect(mocks.onINPSpy).toHaveBeenCalledTimes(1)
    expect(mocks.onCLSSpy).toHaveBeenCalledTimes(1)

    emitMetrics()
  })

  it('falls back to setTimeout when requestIdleCallback is unavailable', async () => {
    vi.useFakeTimers()

    startWebVitalsTracking()

    await vi.runOnlyPendingTimersAsync()

    expect(mocks.onLCPSpy).toHaveBeenCalledTimes(1)
    expect(mocks.onINPSpy).toHaveBeenCalledTimes(1)
    expect(mocks.onCLSSpy).toHaveBeenCalledTimes(1)

    emitMetrics()

    vi.useRealTimers()
  })
})
