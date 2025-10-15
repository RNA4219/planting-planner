import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TOAST_AUTO_DISMISS_MS } from '../../../constants/toast'
import { TOAST_MESSAGES } from '../../../constants/messages'

import {
  capturedOptions,
  createStatus,
  fetchRefreshStatusMock,
  postRefreshMock,
  renderController,
} from './setup'

describe('useRefreshStatusController / success toasts', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('refresh 成功時に lastSync を更新し永続化する', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('running'))
    fetchRefreshStatusMock.mockResolvedValueOnce(
      createStatus('success', {
        finished_at: '2024-01-01T00:30:00Z',
        updated_records: 7,
      }),
    )

    const { result } = renderController()

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(1000)
      await promise
    })

    expect(result.current.lastSync).toEqual({
      finished_at: '2024-01-01T00:30:00Z',
      updated_records: 7,
    })
    expect(JSON.parse(localStorage.getItem('refresh:lastSync') ?? 'null')).toEqual({
      finished_at: '2024-01-01T00:30:00Z',
      updated_records: 7,
    })
  })

  it('永続化された lastSync を初期値として返す', () => {
    localStorage.setItem(
      'refresh:lastSync',
      JSON.stringify({ finished_at: '2023-12-31T23:59:59Z', updated_records: 4 }),
    )

    const { result } = renderController()

    expect(result.current.lastSync).toEqual({
      finished_at: '2023-12-31T23:59:59Z',
      updated_records: 4,
    })
  })

  it('成功時にトーストを表示し onSuccess を呼び出す', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('running'))
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('success', { updated_records: 5 }))

    const onSuccess = vi.fn()
    const { result } = renderController({ onSuccess })

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(1000)
      await promise
    })

    const typedOptions = capturedOptions.at(-1)
    expect(typedOptions?.pollIntervalMs).toBe(1000)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(fetchRefreshStatusMock).toHaveBeenCalledTimes(2)
    expect(result.current.pendingToasts.at(-1)).toMatchObject({
      variant: 'success',
      message: 'データ更新が完了しました',
      detail: '5件のデータを更新しました。',
    })
  })

  it('onSuccess が拒否しても未処理拒否が発生しない', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'success', updated_records: 1, last_error: null })

    const catchSpy = vi.spyOn(Promise.prototype, 'catch')
    const onSuccess = vi.fn(() => Promise.reject(new Error('rejected')))
    const initialCatchCalls = catchSpy.mock.calls.length

    try {
      const { result } = renderController({ onSuccess })

      await act(async () => {
        await expect(result.current.startRefresh()).resolves.toBeUndefined()
      })

      await Promise.resolve()
      await vi.runAllTicks()

      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(catchSpy.mock.calls.length).toBe(initialCatchCalls + 1)
      expect(result.current.pendingToasts.at(-1)).toMatchObject({
        variant: 'success',
        message: 'データ更新が完了しました',
      })
    } finally {
      catchSpy.mockRestore()
    }
  })

  it('postRefresh の成功応答をトースト詳細へ反映する', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'success', updated_records: 3, last_error: null })

    const { result } = renderController()

    await act(async () => {
      await result.current.startRefresh()
    })

    expect(fetchRefreshStatusMock).not.toHaveBeenCalled()
    expect(result.current.pendingToasts.at(-1)).toMatchObject({
      variant: 'success',
      message: 'データ更新が完了しました',
      detail: '3件のデータを更新しました。',
    })
  })

  it('postRefresh の失敗応答で last_error を表示する', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'failure', updated_records: 0, last_error: 'fatal' })

    const { result } = renderController()

    await act(async () => {
      await result.current.startRefresh()
    })

    expect(fetchRefreshStatusMock).not.toHaveBeenCalled()
    expect(result.current.pendingToasts.at(-1)).toMatchObject({
      variant: 'error',
      message: 'データ更新に失敗しました',
      detail: 'fatal',
    })
  })

  it('トーストは 5 秒後に自動クローズされる', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'success', updated_records: 2, last_error: null })

    const { result } = renderController()

    await act(async () => {
      await result.current.startRefresh()
    })

    expect(result.current.pendingToasts).toHaveLength(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOAST_AUTO_DISMISS_MS - 1)
    })
    expect(result.current.pendingToasts).toHaveLength(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
      await vi.runAllTicks()
    })
    expect(result.current.pendingToasts).toHaveLength(0)
  })

  it('dismissToast で手動クローズできる', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'success', updated_records: 4, last_error: null })

    const { result } = renderController()

    await act(async () => {
      await result.current.startRefresh()
    })

    const toast = result.current.pendingToasts.at(-1)
    expect(toast).toBeDefined()

    await act(async () => {
      if (toast) {
        result.current.dismissToast(toast.id)
      }
    })

    expect(result.current.pendingToasts).toHaveLength(0)
  })

  it('タイムアウト時に警告トーストを追加する', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockResolvedValue(createStatus('running'))

    const { result } = renderController({ timeoutMs: 2000 })

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.advanceTimersByTimeAsync(2000)
      await vi.runAllTicks()
      await promise
    })

    expect(result.current.pendingToasts.at(-1)).toMatchObject({
      variant: 'warning',
      message: TOAST_MESSAGES.refreshStatusTimeout,
      detail: TOAST_MESSAGES.refreshStatusTimeoutDetail,
    })
  })
})
