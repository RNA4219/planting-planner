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
  const renderController = () =>
    renderHook(() => useRefreshStatusController({ pollIntervalMs: 1000, timeoutMs: 4000 }))

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('更新開始時に情報トーストを追加する', async () => {
    const { result, unmount } = renderController()

    let resolvePost:
      | ((value: { state: 'running' | 'success' | 'failure' | 'stale' }) => void)
      | undefined
    postRefreshMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve
        }),
    )
    fetchRefreshStatusMock.mockResolvedValue(createStatus('running'))

    await act(async () => {
      void result.current.startRefresh()
    })

    expect(resolvePost).toBeDefined()

    await act(async () => {
      resolvePost?.({ state: 'running' })
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.pendingToasts.at(-1)).toMatchObject({ variant: 'info' })

    act(() => {
      unmount()
    })
  })

  it('開始から終了までのフローを制御し、成功・失敗・タイムアウト時のトーストを生成する', async () => {
    const reloadCurrentWeekMock = vi.fn()
    const { result } = renderHook(() =>
      useRefreshStatusController({
        pollIntervalMs: 1000,
        timeoutMs: 4000,
        onSuccess: reloadCurrentWeekMock,
      }),
    )

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    try {
      postRefreshMock.mockResolvedValueOnce({ state: 'running' })
      fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('running'))
      fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('success', { updated_records: 8 }))

      await act(async () => {
        const promise = result.current.startRefresh()
        await vi.advanceTimersByTimeAsync(1000)
        await vi.advanceTimersByTimeAsync(1000)
        await promise
      })

      const timerIndex = setTimeoutSpy.mock.calls.findIndex(([, delay]) => delay === 5000)
      expect(timerIndex).toBeGreaterThanOrEqual(0)
    } finally {
      setTimeoutSpy.mockRestore()
    }

    expect(fetchRefreshStatusMock).toHaveBeenCalledTimes(2)
    expect(result.current.pendingToasts).toEqual([
      expect.objectContaining({
        variant: 'success',
        detail: '更新件数: 8',
      }),
    ])
    expect(reloadCurrentWeekMock).toHaveBeenCalledTimes(1)
    const successToastId = result.current.pendingToasts[0]?.id
    expect(successToastId).toBeDefined()
    expect(result.current.pendingToasts.some((toast) => toast.id === successToastId)).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(result.current.pendingToasts.some((toast) => toast.id === successToastId)).toBe(false)

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

    expect(result.current.pendingToasts.at(-1)).toMatchObject({ variant: 'error' })
    expect(result.current.isRefreshing).toBe(false)

    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('running'))
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('success', { updated_records: 1 }))

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(1000)
      await promise
    })

    const dismissTargetId = result.current.pendingToasts.at(-1)?.id
    expect(dismissTargetId).toBeDefined()
    if (dismissTargetId) {
      act(() => {
        result.current.dismissToast(dismissTargetId)
      })
    }
    expect(result.current.pendingToasts.some((toast) => toast.id === dismissTargetId)).toBe(false)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(result.current.pendingToasts.some((toast) => toast.id === dismissTargetId)).toBe(false)
    expect(reloadCurrentWeekMock).toHaveBeenCalledTimes(2)
  })

  it('stale のトーストは重複して追加されない', async () => {
    const { result } = renderController()

    postRefreshMock.mockResolvedValue({ state: 'stale' })

    await act(async () => {
      const promise = result.current.startRefresh()
      await promise
    })

    expect(result.current.pendingToasts).toHaveLength(1)

    await act(async () => {
      const promise = result.current.startRefresh()
      await promise
    })

    expect(result.current.pendingToasts).toHaveLength(1)
    expect(result.current.pendingToasts.at(-1)).toMatchObject({ variant: 'warning' })
  })
})
