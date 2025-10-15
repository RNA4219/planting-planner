import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { ServiceWorkerClientEvent } from '../../src/lib/swClient'

const trackMock = vi.fn()

vi.mock('../../src/lib/telemetry', () => ({
  track: trackMock,
}))

let messageListener: ((event: MessageEvent) => void) | undefined

beforeEach(() => {
  vi.resetModules()
  trackMock.mockReset()
  trackMock.mockResolvedValue(undefined)
  messageListener = undefined

  const waitingWorker = {
    state: 'installed',
    postMessage: vi.fn(),
  } as unknown as ServiceWorker

  const registration = {
    waiting: waitingWorker,
    addEventListener: vi.fn(),
  } as unknown as ServiceWorkerRegistration

  const serviceWorker = {
    register: vi.fn().mockResolvedValue(registration),
    addEventListener: vi.fn((event: string, listener: EventListenerOrEventListenerObject) => {
      if (event === 'message') {
        messageListener = listener as (event: MessageEvent) => void
      }
    }),
    controller: {},
  }

  Object.defineProperty(globalThis, 'navigator', {
    value: {
      onLine: true,
      serviceWorker,
    },
    configurable: true,
  })

  Object.defineProperty(globalThis, 'window', {
    value: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    configurable: true,
  })
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'navigator')
  Reflect.deleteProperty(globalThis, 'window')
})

describe('swClient handleMessage', () => {
  test('emits waiting event and telemetry when SW_WAITING message is received', async () => {
    const module = await import('../../src/lib/swClient')
    const { registerServiceWorker, subscribe, getSnapshot } = module

    const events: ServiceWorkerClientEvent[] = []
    const unsubscribe = subscribe((event) => {
      events.push(event)
    })

    await registerServiceWorker()

    // Clear initial events triggered during registration
    events.length = 0

    const waitingBefore = getSnapshot().waiting
    expect(waitingBefore).not.toBeNull()
    expect(messageListener).toBeDefined()

    messageListener?.({
      data: { type: 'SW_WAITING', version: '9.9.9' },
    } as unknown as MessageEvent)

    expect(trackMock).toHaveBeenCalledWith('sw.waiting', { version: '9.9.9' })

    const waitingAfter = getSnapshot().waiting
    expect(waitingAfter).toBe(waitingBefore)

    expect(events).toHaveLength(1)
    const [event] = events
    expect(event.type).toBe('waiting')
    expect(event.type === 'waiting' ? event.registration.waiting : null).toBe(waitingBefore)

    unsubscribe()
  })
})
