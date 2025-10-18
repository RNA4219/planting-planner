import { afterEach, beforeEach, vi } from 'vitest'

export type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>

export interface ApiTestContext {
  readonly fetchMock: FetchMock
  setApiEndpoint(endpoint: string): void
  loadApiModule(): Promise<typeof import('../api')>
}

export const createApiTestContext = (): ApiTestContext => {
  let apiEndpoint = '/api'
  let fetchMock: FetchMock | undefined

  beforeEach(() => {
    vi.resetModules()
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('navigator', {
      sendBeacon: vi.fn(() => true),
    } as unknown as Navigator)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  return {
    get fetchMock() {
      if (!fetchMock) {
        throw new Error('fetchMock is not initialized')
      }
      return fetchMock
    },
    setApiEndpoint(endpoint: string) {
      apiEndpoint = endpoint
    },
    async loadApiModule() {
      vi.stubEnv('VITE_API_ENDPOINT', apiEndpoint)
      return import('../api')
    },
  }
}
