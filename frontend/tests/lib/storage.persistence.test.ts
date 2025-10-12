import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('storage persistence', () => {
  const REGION_KEY = 'plantingPlanner.region'

  const importStorage = () =>
    vi.importActual<typeof import('../../src/lib/storage')>('../../src/lib/storage')

  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
    vi.resetModules()
  })

  it('round-trips regions via JSON persistence', async () => {
    const { saveRegion, loadRegion } = await importStorage()

    saveRegion('cold')

    expect(window.localStorage.getItem(REGION_KEY)).toBe('"cold"')
    expect(loadRegion()).toBe('cold')
  })

  it('migrates legacy plain string region values to JSON persistence', async () => {
    window.localStorage.setItem(REGION_KEY, 'warm')

    const { loadRegion } = await importStorage()

    expect(loadRegion()).toBe('warm')
    expect(window.localStorage.getItem(REGION_KEY)).toBe('"warm"')
  })
})
