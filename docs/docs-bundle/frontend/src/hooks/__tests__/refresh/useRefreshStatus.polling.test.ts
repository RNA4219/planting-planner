import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  capturedOptions,
  createStatus,
  fetchRefreshStatusMock,
  postRefreshMock,
  renderController,
  renderControllerWithOptions,
} from './setup'

describe('useRefreshStatusController / polling', () => {
  it('既定の pollIntervalMs は 5000ms', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('running'))
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('success'))

    const { result } = renderControllerWithOptions({ timeoutMs: 4000 })

    await act(async () => {
      const promise = result.current.startRefresh()
      const latestOptions = capturedOptions.at(-1)

      try {
        expect(latestOptions?.pollIntervalMs).toBe(5000)
      } finally {
        const interval = latestOptions?.pollIntervalMs ?? 0
        if (interval > 0) {
          await vi.advanceTimersByTimeAsync(interval)
        }
        await vi.runAllTicks()
        await promise
      }
    })
  })

  it('pollIntervalMs を指定するとポーリング間隔を反映する', async () => {
    postRefreshMock.mockResolvedValueOnce({ state: 'running' })
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('running'))
    fetchRefreshStatusMock.mockResolvedValueOnce(createStatus('success'))

    const { result } = renderController({ pollIntervalMs: 1000 })

    await act(async () => {
      const promise = result.current.startRefresh()
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(1000)
      await promise
    })

    const latestOptions = capturedOptions.at(-1)
    expect(latestOptions?.pollIntervalMs).toBe(1000)
    expect(fetchRefreshStatusMock).toHaveBeenCalledTimes(2)
  })
})
