import { describe, expect, test } from 'vitest'

import { sendTelemetry, track } from '../telemetry'

describe('telemetry', () => {
  test('track is exported for compatibility', () => {
    expect(track).toBe(sendTelemetry)
  })
})
