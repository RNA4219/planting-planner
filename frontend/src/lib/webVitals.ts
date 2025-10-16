import type { Metric } from 'web-vitals'

import { track } from './telemetry'

type MetricEventName = 'web_vitals.lcp' | 'web_vitals.inp' | 'web_vitals.cls'

const createHandler = (event: MetricEventName) => (metric: Metric) => {
  const payload: Record<string, unknown> = {
    id: metric.id,
    value: metric.value,
    delta: metric.delta,
  }

  if (typeof metric.rating === 'string') {
    payload.rating = metric.rating
  }

  void track(event, payload)
}

export const startWebVitalsTracking = (): Promise<void> => {
  const globalWithIdle = globalThis as typeof globalThis & {
    requestIdleCallback?: typeof window.requestIdleCallback
  }

  const schedule = (callback: () => void) => {
    if (typeof globalWithIdle.requestIdleCallback === 'function') {
      globalWithIdle.requestIdleCallback(() => {
        callback()
      })
      return
    }
    setTimeout(callback, 0)
  }

  return new Promise<void>((resolve) => {
    schedule(() => {
      void import('web-vitals')
        .then(({ onCLS, onINP, onLCP }) => {
          onLCP(createHandler('web_vitals.lcp'))
          onINP(createHandler('web_vitals.inp'))
          onCLS(createHandler('web_vitals.cls'))
        })
        .catch(() => {
          // Web Vitals の計測失敗は致命的ではないため握りつぶす
        })
        .finally(() => {
          resolve()
        })
    })
  })
}
