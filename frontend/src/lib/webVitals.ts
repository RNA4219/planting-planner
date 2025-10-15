import type { Metric } from 'web-vitals'
import { onCLS, onINP, onLCP } from 'web-vitals'

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

export const startWebVitalsTracking = (): void => {
  onLCP(createHandler('web_vitals.lcp'))
  onINP(createHandler('web_vitals.inp'))
  onCLS(createHandler('web_vitals.cls'))
}
