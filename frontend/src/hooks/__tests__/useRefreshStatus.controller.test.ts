import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RefreshStatusResponse } from '../../types'

import { useRefreshStatusController } from '../refresh/controller'

type PostRefreshMock = () => Promise<{ state: 'running' | 'success' | 'failure' | 'stale' }>

type FetchRefreshStatusMock = () => Promise<RefreshStatusResponse>

const { postRefreshMock, fetchRefreshStatusMock } = vi.hoisted(() => ({
  postRefreshMock: vi.fn<PostRefreshMock>(),
  fetchRefreshStatusMock: vi.fn<FetchRefreshStatusMock>(),
}))

vi.mock('../../lib/api', () => ({
  postRefresh: postRefreshMock,
  fetchRefreshStatus: fetchRefreshStatusMock,
}))

const createStatus = (
  state: RefreshStatusResponse['state'],
  overrides: Partial<RefreshStatusResponse> = {},
): RefreshStatusResponse => ({
  state,
  started_at: '2024-01-01T00:00:00Z',
  finished_at: state === 'running' ? null : '2024-01-01T00:10:00Z',
  updated_records: 42,
  last_error: null,
  ...overrides,
})

describe('useRefreshStatusController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('開始から終了までのフローを制御し、成功・失敗・タイムアウト時のトーストを生成する', async () => {
    const { result } = renderHook(() =>
      useRefreshStatusController({ pollIntervalMs: 1000, timeoutMs: 4000 }),
    )

    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('running'))
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('success', { updated_records: 8 }))

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(1000)
      await promise
    })

    expect(fetchRefreshStatusMock).toHaveBeenCalledTimes(2)
    expect(result.current.pendingToasts).toEqual([
      expect.objectContaining({
        variant: 'success',
        detail: '更新件数: 8',
      }),
    ])

    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockImplementationOnce(async () => createStatus('running'))
    fetchRefreshStatusMock.mockImplementationOnce(async () =>
      createStatus('failure', { last_error: 'boom' }),
    )

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(1000)
      await promise
    })

    expect(result.current.pendingToasts.at(-1)).toMatchObject({ variant: 'error', detail: 'boom' })

    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockImplementation(async () => createStatus('running'))

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.advanceTimersByTimeAsync(4000)
      await promise
    })

    expect(result.current.pendingToasts.at(-1)).toMatchObject({ variant: 'warning' })
    expect(result.current.isRefreshing).toBe(false)
  })
})
