import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { TOAST_MESSAGES } from '../src/constants/messages'
import { useAppNotifications } from '../src/app/useAppNotifications'
import type { ToastStackItem } from '../src/components/ToastStack'
import { useRefreshStatusController } from '../src/hooks/refresh/controller'
import type { ServiceWorkerClientEvent } from '../src/lib/swClient'

const mockSkipWaiting = vi.fn()
const listeners = new Set<(event: ServiceWorkerClientEvent) => void>()
let mockSnapshot = {
  waiting: null as ServiceWorker | null,
  isOffline: false,
  lastSyncAt: null as string | null,
}
let mockForceUpdateEnabled = false

vi.mock('../src/lib/swClient', () => ({
  subscribe: vi.fn((listener: (event: ServiceWorkerClientEvent) => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }),
  getSnapshot: vi.fn(() => mockSnapshot),
  skipWaiting: (...args: unknown[]) => {
    mockSkipWaiting(...args)
  },
  registerServiceWorker: vi.fn(),
  isForceUpdateEnabled: vi.fn(() => mockForceUpdateEnabled),
  setLastSync: vi.fn((value: string | null) => {
    mockSnapshot = { ...mockSnapshot, lastSyncAt: value }
    listeners.forEach((listener) => listener({ type: 'last-sync', lastSyncAt: value }))
  }),
}))

vi.mock('../src/hooks/refresh/controller', () => ({
  useRefreshStatusController: vi.fn(),
}))

vi.mock('../src/lib/telemetry', () => ({
  sendTelemetry: vi.fn(),
}))

const useRefreshStatusControllerMock = vi.mocked(useRefreshStatusController)
const subscribeMock = vi.mocked((await import('../src/lib/swClient')).subscribe)

const emitEvent = (event: ServiceWorkerClientEvent) => {
  if (event.type === 'waiting') {
    mockSnapshot = { ...mockSnapshot, waiting: event.registration.waiting }
  }
  if (event.type === 'waiting-cleared') {
    mockSnapshot = { ...mockSnapshot, waiting: null }
  }
  if (event.type === 'offline') {
    mockSnapshot = { ...mockSnapshot, isOffline: event.isOffline }
  }
  if (event.type === 'last-sync') {
    mockSnapshot = { ...mockSnapshot, lastSyncAt: event.lastSyncAt }
  }
  listeners.forEach((listener) => listener(event))
}

describe('useAppNotifications', () => {
  afterEach(() => {
    useRefreshStatusControllerMock.mockReset()
    listeners.clear()
    mockSkipWaiting.mockReset()
    mockSnapshot = {
      waiting: null,
      isOffline: false,
      lastSyncAt: null,
    }
    mockForceUpdateEnabled = false
    subscribeMock.mockClear()
  })

  beforeEach(() => {
    subscribeMock.mockImplementation((listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    })
  })

  test('マーケットフォールバック時にトーストを1件だけ表示し続ける', async () => {
    const reloadCurrentWeek = vi.fn()
    const startRefresh = vi.fn()
    const dismissToast = vi.fn()
    const pendingToastsRef: { current: ToastStackItem[] } = { current: [] }

    useRefreshStatusControllerMock.mockImplementation(() => ({
      isRefreshing: false,
      startRefresh,
      pendingToasts: pendingToastsRef.current,
      dismissToast,
    }))

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

    for (let i = 0; i < 2; i += 1) {
      await act(async () => {
        rerender()
      })
      expect(result.current.combinedToasts).toHaveLength(1)
      const [currentToast] = result.current.combinedToasts
      expect(currentToast.id).toBe(initialToast.id)
      expect(currentToast.variant).toBe('warning')
    }

    const successToast: ToastStackItem = {
      id: 'success-toast',
      variant: 'success',
      message: 'ok',
      detail: null,
    }
    pendingToastsRef.current = [successToast]

    await act(async () => {
      rerender()
    })

    expect(result.current.combinedToasts).toHaveLength(2)
    const [firstToast, secondToast] = result.current.combinedToasts
    expect(firstToast).toBe(successToast)
    expect(secondToast.id).toBe(initialToast.id)
    expect(secondToast.variant).toBe('warning')

    await act(async () => {
      rerender()
    })
    expect(result.current.combinedToasts).toHaveLength(2)
    const [, latestFallback] = result.current.combinedToasts
    expect(latestFallback.id).toBe(initialToast.id)

    await act(async () => {
      result.current.handleToastDismiss(initialToast.id)
    })

    expect(result.current.combinedToasts).toHaveLength(2)
    let [successAfterDismiss, restoredFallback] = result.current.combinedToasts
    expect(successAfterDismiss).toBe(successToast)
    expect(restoredFallback.id).not.toBe(initialToast.id)
    expect(restoredFallback.variant).toBe('warning')
    expect(restoredFallback.message).toBe(TOAST_MESSAGES.recommendationFallbackWarning)

    await act(async () => {
      rerender()
    })

    expect(result.current.combinedToasts).toHaveLength(2)
    ;[successAfterDismiss, restoredFallback] = result.current.combinedToasts
    expect(successAfterDismiss).toBe(successToast)
    expect(restoredFallback.variant).toBe('warning')
    expect(restoredFallback.message).toBe(TOAST_MESSAGES.recommendationFallbackWarning)
  })

  test('待機中の Service Worker が存在する場合に更新トーストを表示し「今すぐ更新」で SKIP_WAITING を送信する', async () => {
    const waitingWorker = {
      postMessage: vi.fn(),
    } as unknown as ServiceWorker
    mockSnapshot = {
      ...mockSnapshot,
      waiting: waitingWorker,
    }

    useRefreshStatusControllerMock.mockReturnValue({
      isRefreshing: false,
      startRefresh: vi.fn(),
      pendingToasts: [],
      dismissToast: vi.fn(),
    })

    const { result } = renderHook(() =>
      useAppNotifications({ reloadCurrentWeek: vi.fn(), isMarketFallback: false }),
    )

    expect(result.current.combinedToasts).toHaveLength(1)
    const [updateToast] = result.current.combinedToasts
    expect(updateToast.variant).toBe('info')
    expect(updateToast.message).toBe(TOAST_MESSAGES.serviceWorkerUpdateAvailable)
    expect(updateToast.actions).toEqual([
      { id: 'update-now', label: TOAST_MESSAGES.serviceWorkerUpdateNow },
      { id: 'dismiss-update', label: TOAST_MESSAGES.serviceWorkerUpdateLater },
    ])
    expect(updateToast.sticky).toBe(true)

    await act(async () => {
      result.current.handleToastAction(updateToast.id, 'update-now')
    })

    expect(mockSkipWaiting).toHaveBeenCalledTimes(1)
    expect(mockSkipWaiting).toHaveBeenCalledWith()
    expect(waitingWorker.postMessage).not.toHaveBeenCalled()

    expect(result.current.combinedToasts).toHaveLength(0)
  })

  test('SW_FORCE_UPDATE が有効な場合に更新トーストを強制表示し「今すぐ更新」でのみ閉じられる', async () => {
    const waitingWorker = {
      postMessage: vi.fn(),
    } as unknown as ServiceWorker
    mockForceUpdateEnabled = true
    mockSnapshot = {
      ...mockSnapshot,
      waiting: waitingWorker,
    }

    useRefreshStatusControllerMock.mockReturnValue({
      isRefreshing: false,
      startRefresh: vi.fn(),
      pendingToasts: [],
      dismissToast: vi.fn(),
    })

    const { result } = renderHook(() =>
      useAppNotifications({ reloadCurrentWeek: vi.fn(), isMarketFallback: false }),
    )

    expect(mockSkipWaiting).not.toHaveBeenCalled()
    expect(result.current.combinedToasts).toHaveLength(1)
    const [forceUpdateToast] = result.current.combinedToasts
    expect(forceUpdateToast.actions).toEqual([
      { id: 'update-now', label: TOAST_MESSAGES.serviceWorkerUpdateNow },
    ])
    expect(forceUpdateToast.sticky).toBe(true)

    await act(async () => {
      result.current.handleToastDismiss(forceUpdateToast.id)
    })

    expect(result.current.combinedToasts).toHaveLength(1)
    const [toastAfterDismissAttempt] = result.current.combinedToasts
    expect(toastAfterDismissAttempt.id).toBe(forceUpdateToast.id)

    await act(async () => {
      result.current.handleToastAction(forceUpdateToast.id, 'update-now')
    })

    expect(mockSkipWaiting).toHaveBeenCalledTimes(1)
    expect(mockSkipWaiting).toHaveBeenCalledWith()
    expect(result.current.combinedToasts).toHaveLength(0)
  })

  test('オフラインイベントでバナーを表示し telemetry を送信する', async () => {
    const telemetryModule = await import('../src/lib/telemetry')
    const sendTelemetryMock = vi.spyOn(telemetryModule, 'sendTelemetry')
    const reloadCurrentWeek = vi.fn()

    useRefreshStatusControllerMock.mockReturnValue({
      isRefreshing: false,
      startRefresh: vi.fn(),
      pendingToasts: [],
      dismissToast: vi.fn(),
    })

    const { result } = renderHook(() =>
      useAppNotifications({ reloadCurrentWeek, isMarketFallback: false }),
    )

    expect(result.current.isOffline).toBe(false)
    expect(result.current.offlineBanner).toBeNull()
    expect(sendTelemetryMock).not.toHaveBeenCalled()

    await act(async () => {
      emitEvent({ type: 'offline', isOffline: true })
      emitEvent({ type: 'last-sync', lastSyncAt: '2024-01-01T12:00:00Z' })
    })

    expect(result.current.isOffline).toBe(true)
    expect(result.current.offlineBanner).not.toBeNull()
    expect(sendTelemetryMock).toHaveBeenCalledWith('offline.banner_shown', {
      lastSyncAt: '2024-01-01T12:00:00Z',
    })

    sendTelemetryMock.mockRestore()
  })
})
