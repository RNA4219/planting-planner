import type { Metric } from 'web-vitals'

import { track } from './telemetry'

type MetricEventName = 'web_vitals.lcp' | 'web_vitals.inp' | 'web_vitals.cls'

type IdleCallbackDeadline = {
  readonly didTimeout: boolean
  timeRemaining(): number
}

type IdleCallback = (deadline: IdleCallbackDeadline) => void

type IdleScheduler = (callback: IdleCallback) => number

type IdleGlobal = {
  requestIdleCallback?: IdleScheduler
}

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

const registerWebVitals = async () => {
  const { onCLS, onINP, onLCP } = await import('web-vitals')
  onLCP(createHandler('web_vitals.lcp'))
  onINP(createHandler('web_vitals.inp'))
  onCLS(createHandler('web_vitals.cls'))
}

type WebVitalsScheduler = (task: () => void | Promise<void>) => void

const runWhenIdle: WebVitalsScheduler = (task) => {
  const { requestIdleCallback } = globalThis as IdleGlobal

  const invoke = () => {
    void task()
  }

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => {
      invoke()
    })
    return
  }

  setTimeout(invoke, 0)
}

export const startWebVitalsTracking = (
  schedule: WebVitalsScheduler = runWhenIdle,
): void => {
  schedule(registerWebVitals)
}
