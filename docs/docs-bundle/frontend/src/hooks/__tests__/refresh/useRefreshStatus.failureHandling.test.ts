import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TOAST_MESSAGES } from '../../../constants/messages'

import { createStatus, fetchRefreshStatusMock, postRefreshMock, renderController } from './setup'

describe('useRefreshStatusController / failure handling', () => {
  it('失敗時にはエラートーストを追加する', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('running'))
    fetchRefreshStatusMock.mockResolvedValueOnce(
      createStatus('failure', { last_error: 'boom', finished_at: '2024-01-01T00:20:00Z' }),
    )

    const { result } = renderController()

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(1000)
      await promise
    })

    expect(fetchRefreshStatusMock).toHaveBeenCalledTimes(2)
    expect(result.current.pendingToasts.at(-1)).toMatchObject({
      variant: 'error',
      message: 'データ更新に失敗しました',
      detail: 'boom',
    })
  })

  it('stale の応答では警告トーストを追加する', async () => {
    postRefreshMock.mockResolvedValue({ state: 'stale' })

    const { result } = renderController()

    await act(async () => {
      await result.current.startRefresh()
    })

    expect(result.current.pendingToasts.at(-1)).toMatchObject({ variant: 'warning' })
  })

  it('stale で警告トーストが重複しない', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('running'))
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('stale'))

    const { result } = renderController()

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.advanceTimersByTimeAsync(1000)
      await vi.runAllTicks()
      await vi.advanceTimersByTimeAsync(1000)
      await vi.runAllTicks()
      await promise
    })

    const warnings = result.current.pendingToasts.filter((toast) => toast.variant === 'warning')
    expect(warnings).toHaveLength(1)
  })

  it('fetchRefreshStatus のエラーで警告トーストが重複しない', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockRejectedValueOnce(new Error('fetch failed'))

    const { result } = renderController()

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.runAllTicks()
      await promise
    })

    const warnings = result.current.pendingToasts.filter(
      (toast) => toast.variant === 'error' && toast.message === TOAST_MESSAGES.refreshStatusFetchFailureMessage,
    )
    expect(warnings).toHaveLength(1)
  })
})
