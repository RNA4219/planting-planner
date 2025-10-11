import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RefreshStatusResponse } from '../../types'
import type { RefreshStatusPollerOptions } from '../refresh/poller'

import { useRefreshStatusController } from '../refresh/controller'

const capturedOptions = vi.hoisted<RefreshStatusPollerOptions[]>(() => [])

vi.mock('../refresh/poller', async () => {
  const actual = await vi.importActual<typeof import('../refresh/poller')>('../refresh/poller')
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

type PostRefreshImmediate =
  Pick<RefreshStatusResponse, 'state'> &
  Partial<Pick<RefreshStatusResponse, 'updated_records' | 'last_error'>>

type PostRefreshMock = () => Promise<PostRefreshImmediate>

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
  started_at: overrides.started_at ?? '2024-01-01T00:00:00Z',
  finished_at: overrides.finished_at ?? (state === 'running' ? null : '2024-01-01T00:10:00Z'),
  updated_records: overrides.updated_records ?? 0,
  last_error: overrides.last_error ?? null,
})

describe('useRefreshStatusController', () => {
  const renderController = () =>
    renderHook(() => useRefreshStatusController({ pollIntervalMs: 1000, timeoutMs: 4000 }))

  beforeEach(() => {
    vi.useFakeTimers()
    postRefreshMock.mockReset()
    fetchRefreshStatusMock.mockReset()
    capturedOptions.length = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('成功時にトーストを表示し onSuccess を呼び出す', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('running'))
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('success', { updated_records: 5 }))

    const onSuccess = vi.fn()
    const { result } = renderHook(() =>
      useRefreshStatusController({ pollIntervalMs: 1000, timeoutMs: 4000, onSuccess }),
    )

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

  it('stale の応答では警告トーストを追加する', async () => {
    postRefreshMock.mockResolvedValue({ state: 'stale' })

    const { result } = renderController()

    await act(async () => {
      await result.current.startRefresh()
    })

    expect(result.current.pendingToasts.at(-1)).toMatchObject({ variant: 'warning' })
  })
})
