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

  describe('startRefresh', () => {
    it('成功時に完了トーストを追加し、ポーリングを停止する', async () => {
      const { result } = renderController()

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
        expect.objectContaining({ variant: 'success', detail: '更新件数: 8' }),
      ])
    })

    it('失敗時にエラートーストを追加する', async () => {
      const { result } = renderController()

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
    })

    it('タイムアウト時に警告トーストを追加し、状態を解除する', async () => {
      const { result } = renderController()

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

  describe('toast lifecycle', () => {
    const enqueueSuccessToast = async () => {
      const { result } = renderController()

      postRefreshMock.mockResolvedValueOnce({ state: 'running' })
      fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('running'))
      fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('success'))

      await act(async () => {
        const promise = result.current.startRefresh()
        await vi.advanceTimersByTimeAsync(1000)
        await vi.advanceTimersByTimeAsync(1000)
        await promise
      })

      return result
    }

    it('トーストは5秒後に自動的に消える', async () => {
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout')

      try {
        const result = await enqueueSuccessToast()
        const toastId = result.current.pendingToasts[0]?.id

        expect(toastId).toBeDefined()

        const timerIndex = setTimeoutSpy.mock.calls.findIndex(([, delay]) => delay === 5000)
        expect(timerIndex).toBeGreaterThanOrEqual(0)

        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000)
        })

        expect(result.current.pendingToasts).toEqual([])
      } finally {
        setTimeoutSpy.mockRestore()
      }
    })

    it('dismissToast はトーストのタイマーを停止する', async () => {
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout')
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

      try {
        const result = await enqueueSuccessToast()
        const toast = result.current.pendingToasts[0]

        expect(toast).toBeDefined()

        const timerIndex = setTimeoutSpy.mock.calls.findIndex(([, delay]) => delay === 5000)
        const timerId = timerIndex === -1 ? undefined : setTimeoutSpy.mock.results[timerIndex]?.value
        expect(timerId).toBeDefined()

        await act(() => {
          result.current.dismissToast(toast!.id)
        })

        expect(result.current.pendingToasts).toEqual([])
        expect(clearTimeoutSpy.mock.calls.at(-1)?.[0]).toBe(timerId)

        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000)
        })

        expect(result.current.pendingToasts).toEqual([])
      } finally {
        setTimeoutSpy.mockRestore()
        clearTimeoutSpy.mockRestore()
      }
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
    })

    it('フェッチエラーのトーストは重複して追加されない', async () => {
      const { result } = renderController()

      postRefreshMock.mockResolvedValue({ state: 'running' })
      fetchRefreshStatusMock.mockRejectedValue(new Error('boom'))

      await act(async () => {
        const promise = result.current.startRefresh()
        await vi.advanceTimersByTimeAsync(1000)
        await promise
      })

      expect(result.current.pendingToasts).toHaveLength(1)

      fetchRefreshStatusMock.mockRejectedValue(new Error('boom'))

      await act(async () => {
        const promise = result.current.startRefresh()
        await vi.advanceTimersByTimeAsync(1000)
        await promise
      })

      expect(result.current.pendingToasts).toHaveLength(1)
    })
  })
})
