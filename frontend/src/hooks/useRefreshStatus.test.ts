import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RefreshStatusResponse } from '../types'

import { useRefreshStatus } from './useRefreshStatus'

type PostRefreshMock = () => Promise<{ state: 'running' | 'success' | 'failure' | 'stale' }>

type FetchRefreshStatusMock = () => Promise<RefreshStatusResponse>

const { postRefreshMock, fetchRefreshStatusMock } = vi.hoisted(() => ({
  postRefreshMock: vi.fn<PostRefreshMock>(),
  fetchRefreshStatusMock: vi.fn<FetchRefreshStatusMock>(),
}))

vi.mock('../lib/api', () => ({
  postRefresh: postRefreshMock,
  fetchRefreshStatus: fetchRefreshStatusMock,
}))

const createStatus = (state: RefreshStatusResponse['state'], overrides: Partial<RefreshStatusResponse> = {}): RefreshStatusResponse => ({
  state,
  started_at: '2024-01-01T00:00:00Z',
  finished_at: state === 'running' ? null : '2024-01-01T00:10:00Z',
  updated_records: 42,
  last_error: null,
  ...overrides,
})

describe('useRefreshStatus', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('ポーリング完了時に成功・失敗・タイムアウトのトーストを通知する', async () => {
    vi.useFakeTimers()

    postRefreshMock.mockResolvedValueOnce({ state: 'running' })

    const responses: RefreshStatusResponse[] = [
      createStatus('running'),
      createStatus('success'),
    ]
    fetchRefreshStatusMock.mockImplementation(async () => {
      const next = responses.shift()
      if (!next) throw new Error('no status')
      return next
    })

    const { result } = renderHook(() => useRefreshStatus({ pollIntervalMs: 1000, timeoutMs: 4000 }))

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(1000)
      await promise
    })

    expect(fetchRefreshStatusMock).toHaveBeenCalledTimes(2)
    expect(result.current.pendingToasts.at(-1)).toMatchObject({ variant: 'success' })

    fetchRefreshStatusMock.mockReset()
    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    const failures: RefreshStatusResponse[] = [
      createStatus('running'),
      createStatus('failure', { last_error: 'boom' }),
    ]
    fetchRefreshStatusMock.mockImplementation(async () => {
      const next = failures.shift()
      if (!next) throw new Error('no status')
      return next
    })

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(1000)
      await promise
    })

    expect(result.current.pendingToasts.at(-1)).toMatchObject({ variant: 'error', detail: 'boom' })

    fetchRefreshStatusMock.mockReset()
    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockResolvedValue(createStatus('running'))

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.advanceTimersByTimeAsync(4000)
      await promise
    })

    expect(result.current.pendingToasts.at(-1)).toMatchObject({ variant: 'warning' })
    expect(fetchRefreshStatusMock.mock.calls.length).toBeGreaterThan(1)
    expect(result.current.isRefreshing).toBe(false)
  })
})
