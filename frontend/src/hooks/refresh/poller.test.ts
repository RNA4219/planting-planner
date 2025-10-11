import { describe, expect, it, vi } from 'vitest'

import { createRefreshStatusPoller } from './poller'
import type { RefreshStatusResponse } from '../../types'

const buildStatus = (state: RefreshStatusResponse['state']): RefreshStatusResponse => ({
  state,
  started_at: null,
  finished_at: null,
  updated_records: 0,
  last_error: null,
})

describe('createRefreshStatusPoller', () => {
  it('stop 時に cancel が呼ばれる', async () => {
    const schedule = vi.fn<(handler: () => void, interval: number) => number>().mockImplementation(() => 1)
    const cancel = vi.fn<(timer: number) => void>()
    const poller = createRefreshStatusPoller({
      pollIntervalMs: 1000,
      fetchStatus: vi.fn().mockResolvedValue(buildStatus('running')),
      isActive: () => true,
      onTerminal: vi.fn(),
      onError: vi.fn(),
      schedule,
      cancel,
    })

    await poller.run()
    poller.stop()

    expect(cancel).toHaveBeenCalledWith(1)
  })

  it('stale 状態では onTerminal が一度だけ呼ばれる', async () => {
    const onTerminal = vi.fn()
    const poller = createRefreshStatusPoller({
      pollIntervalMs: 1000,
      fetchStatus: vi.fn().mockResolvedValue(buildStatus('stale')),
      isActive: () => true,
      onTerminal,
      onError: vi.fn(),
    })

    await poller.run()

    expect(onTerminal).toHaveBeenCalledTimes(1)
    expect(onTerminal).toHaveBeenCalledWith(buildStatus('stale'))
  })

  it('エラー時に onError 後 stop される', async () => {
    let scheduledHandler: (() => void) | null = null
    const schedule = vi
      .fn<(handler: () => void, interval: number) => number>()
      .mockImplementation((handler) => {
        scheduledHandler = handler
        return 1
      })
    const cancel = vi.fn<(timer: number) => void>()
    const onError = vi.fn()
    const fetchStatus = vi
      .fn<() => Promise<RefreshStatusResponse>>()
      .mockResolvedValueOnce(buildStatus('running'))
      .mockImplementationOnce(() => Promise.reject(new Error('fail')))

    const poller = createRefreshStatusPoller({
      pollIntervalMs: 1000,
      fetchStatus,
      isActive: () => true,
      onTerminal: vi.fn(),
      onError,
      schedule,
      cancel,
    })

    await poller.run()
    expect(schedule).toHaveBeenCalledTimes(1)
    scheduledHandler?.()
    await Promise.resolve()

    expect(onError).toHaveBeenCalledTimes(1)
    expect(cancel).toHaveBeenCalledWith(1)
  })
})
