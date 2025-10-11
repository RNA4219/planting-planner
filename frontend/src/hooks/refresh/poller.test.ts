import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RefreshState, RefreshStatusResponse } from '../../types'
import { createRefreshStatusPoller } from './poller'
import type { RefreshStatusPollerOptions } from './poller'

const createStatus = (state: RefreshState): RefreshStatusResponse => ({
  state,
  started_at: null,
  finished_at: null,
  updated_records: 0,
  last_error: null,
})

describe('createRefreshStatusPoller', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('clears scheduled timer when stopped', async () => {
    const timerHandle = Symbol('timer') as unknown as ReturnType<typeof setTimeout>
    const schedule = vi
      .fn<(cb: () => void, delay: number) => ReturnType<typeof setTimeout>>()
      .mockImplementation(() => timerHandle)
    const cancel = vi.fn<(handle: ReturnType<typeof setTimeout>) => void>()
    const fetchStatus = vi
      .fn<() => Promise<RefreshStatusResponse>>()
      .mockResolvedValue(createStatus('running'))

    const poller = createRefreshStatusPoller({
      pollIntervalMs: 10,
      fetchStatus,
      isActive: () => true,
      onTerminal: vi.fn(),
      onError: vi.fn(),
      schedule,
      cancel,
    })

    await poller.run()

    expect(schedule).toHaveBeenCalledOnce()

    poller.stop()

    expect(cancel).toHaveBeenCalledWith(timerHandle)
  })

  it('invokes onTerminal only once when state becomes stale', async () => {
    vi.useFakeTimers()

    const pollIntervalMs = 100
    const fetchStatus = vi
      .fn<() => Promise<RefreshStatusResponse>>()
      .mockResolvedValueOnce(createStatus('running'))
      .mockResolvedValueOnce(createStatus('stale'))
      .mockResolvedValue(createStatus('stale'))
    const onTerminal = vi.fn<(status: RefreshStatusResponse) => void>()
    const onError = vi.fn<(error: unknown) => void>()

    const schedule: NonNullable<RefreshStatusPollerOptions['schedule']> = (cb, delay) =>
      setInterval(cb, delay ?? pollIntervalMs) as unknown as ReturnType<typeof setTimeout>
    const cancel: NonNullable<RefreshStatusPollerOptions['cancel']> = (handle) => {
      clearInterval(handle as unknown as ReturnType<typeof setInterval>)
    }

    const poller = createRefreshStatusPoller({
      pollIntervalMs,
      fetchStatus,
      isActive: () => true,
      onTerminal,
      onError,
      schedule,
      cancel,
    })

    await poller.run()

    await vi.advanceTimersByTimeAsync(pollIntervalMs)

    expect(onTerminal).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(pollIntervalMs)

    expect(onTerminal).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })
})
