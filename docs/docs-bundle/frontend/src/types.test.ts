import { describe, it, expectTypeOf } from 'vitest'

import type { CropsResponse, GrowthDays, HealthResponse } from './types'

describe('Type definitions', () => {
  it('defines HealthResponse structure', () => {
    expectTypeOf<HealthResponse>().toEqualTypeOf<{ status: string }>()
  })

  it('defines CropsResponse as an array of Crop', () => {
    expectTypeOf<CropsResponse>().toEqualTypeOf<import('./types').Crop[]>()
  })

  it('defines GrowthDays mapping', () => {
    expectTypeOf<GrowthDays>().toEqualTypeOf<{
      crop_id: number
      region: import('./types').Region
      days: number
    }>()
  })
})
