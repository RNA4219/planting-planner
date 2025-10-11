import type { RefreshState, RefreshStatusResponse } from '../../types'

export const TERMINAL_STATES: ReadonlySet<RefreshState> = new Set(['success', 'failure', 'stale'])

export const isTerminalState = (state: RefreshState): boolean => TERMINAL_STATES.has(state)

export interface RefreshStatusPollerOptions {
  readonly pollIntervalMs: number
  readonly fetchStatus: () => Promise<RefreshStatusResponse>
  readonly isActive: () => boolean
  readonly onTerminal: (status: RefreshStatusResponse) => void
  readonly onError: (error: unknown) => void
  readonly schedule?: typeof setTimeout
  readonly cancel?: typeof clearTimeout
}

export interface RefreshStatusPoller {
  readonly run: () => Promise<void>
  readonly stop: () => void
}

export const createRefreshStatusPoller = (
  options: RefreshStatusPollerOptions,
): RefreshStatusPoller => {
  let timer: ReturnType<typeof setTimeout> | null = null

  const clearTimer = (): void => {
    if (timer) {
      const cancel = options.cancel ?? clearTimeout
      cancel(timer)
      timer = null
    }
  }

  const tick = async (): Promise<void> => {
    clearTimer()
    if (!options.isActive()) return
    try {
      const status = await options.fetchStatus()
      if (!options.isActive()) return
      if (isTerminalState(status.state)) {
        options.onTerminal(status)
        clearTimer()
        return
      }
      const schedule = options.schedule ?? setTimeout
      timer = schedule(() => {
        void tick()
      }, options.pollIntervalMs)
    } catch (error) {
      options.onError(error)
      clearTimer()
    }
  }

  return {
    async run() {
      clearTimer()
      await tick()
    },
    stop() {
      clearTimer()
    },
  }
}
