import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { TOAST_MESSAGES } from '../src/constants/messages'
import { useAppNotifications } from '../src/app/useAppNotifications'
import { useRefreshStatusController } from '../src/hooks/refresh/controller'

vi.mock('../src/hooks/refresh/controller', () => ({
  useRefreshStatusController: vi.fn(),
}))

const useRefreshStatusControllerMock = vi.mocked(useRefreshStatusController)

describe('useAppNotifications', () => {
  afterEach(() => {
    useRefreshStatusControllerMock.mockReset()
  })

  test('マーケットフォールバック時にトーストを1件だけ表示し続ける', async () => {
    const reloadCurrentWeek = vi.fn()
    useRefreshStatusControllerMock.mockReturnValue({
      isRefreshing: false,
      startRefresh: vi.fn(),
      pendingToasts: [],
      dismissToast: vi.fn(),
    })

    const { result, rerender } = renderHook(() =>
      useAppNotifications({ reloadCurrentWeek, isMarketFallback: true }),
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.combinedToasts).toHaveLength(1)
    const [initialToast] = result.current.combinedToasts
    expect(initialToast.variant).toBe('warning')
    expect(initialToast.message).toBe(TOAST_MESSAGES.recommendationFallbackWarning)

    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        rerender()
      })
      expect(result.current.combinedToasts).toHaveLength(1)
      const [currentToast] = result.current.combinedToasts
      expect(currentToast.id).toBe(initialToast.id)
      expect(currentToast.variant).toBe('warning')
    }
  })
})
