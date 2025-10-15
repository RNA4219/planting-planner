import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

import type { RefreshStatusResponse } from '../../../types'
import type { RefreshStatusPollerOptions } from '../../refresh/poller'
import type { UseRefreshStatusOptions } from '../../refresh/controller'
import { useRefreshStatusController } from '../../refresh/controller'

const capturedOptionsRef = vi.hoisted<RefreshStatusPollerOptions[]>(() => [])

type PostRefreshImmediate =
  Pick<RefreshStatusResponse, 'state'> &
  Partial<Pick<RefreshStatusResponse, 'updated_records' | 'last_error' | 'finished_at'>>

type PostRefreshMock = () => Promise<PostRefreshImmediate>

type FetchRefreshStatusMock = () => Promise<RefreshStatusResponse>

const apiMocks = vi.hoisted(() => {
  const postRefreshMock = vi.fn<PostRefreshMock>()
  const fetchRefreshStatusMock = vi.fn<FetchRefreshStatusMock>()
  return {
    postRefreshMock,
    fetchRefreshStatusMock,
    module: {
      postRefresh: postRefreshMock,
      fetchRefreshStatus: fetchRefreshStatusMock,
    },
  }
})

export const capturedOptions = capturedOptionsRef
export const postRefreshMock = apiMocks.postRefreshMock
export const fetchRefreshStatusMock = apiMocks.fetchRefreshStatusMock

vi.mock('../../refresh/poller', async () => {
  const actual = await vi.importActual<typeof import('../../refresh/poller')>('../../refresh/poller')
  return {
    ...actual,
    createRefreshStatusPoller: vi
      .fn<typeof actual.createRefreshStatusPoller>()
      .mockImplementation((options: RefreshStatusPollerOptions) => {
        capturedOptions.push(options)
        return actual.createRefreshStatusPoller(options)
      }),
  }
})

vi.mock('../../../lib/api', () => apiMocks.module)

export const createStatus = (
  state: RefreshStatusResponse['state'],
  overrides: Partial<RefreshStatusResponse> = {},
): RefreshStatusResponse => ({
  state,
  started_at: overrides.started_at ?? '2024-01-01T00:00:00Z',
  finished_at: overrides.finished_at ?? (state === 'running' ? null : '2024-01-01T00:10:00Z'),
  updated_records: overrides.updated_records ?? 0,
  last_error: overrides.last_error ?? null,
})

const DEFAULT_OPTIONS: UseRefreshStatusOptions = {
  pollIntervalMs: 1000,
  timeoutMs: 4000,
}

export const renderController = (overrides: Partial<UseRefreshStatusOptions> = {}) =>
  renderHook(() => useRefreshStatusController({ ...DEFAULT_OPTIONS, ...overrides }))

export const renderControllerWithOptions = (options?: UseRefreshStatusOptions) =>
  renderHook(() => useRefreshStatusController(options))

beforeEach(() => {
  vi.useFakeTimers()
  postRefreshMock.mockReset()
  fetchRefreshStatusMock.mockReset()
  capturedOptions.length = 0
})

afterEach(() => {
  vi.useRealTimers()
})
