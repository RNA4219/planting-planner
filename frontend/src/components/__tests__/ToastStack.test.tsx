import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TOAST_AUTO_DISMISS_MS } from '../../constants/toast'
import { ToastStack } from '../ToastStack'

const sampleToasts = [
  { id: '1', variant: 'success' as const, message: '更新が完了しました', detail: '更新件数: 3' },
  { id: '2', variant: 'error' as const, message: '更新に失敗しました', detail: 'network error' },
]

describe('ToastStack', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('トーストを role="alert" でレンダリングする', () => {
    render(<ToastStack toasts={sampleToasts} onDismiss={() => {}} />)

    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(sampleToasts.length)
    expect(screen.getByText('更新が完了しました')).toBeInTheDocument()
    expect(screen.getByText('network error')).toBeInTheDocument()
  })

  it('閉じるボタンで onDismiss を呼び出す', () => {
    const handleDismiss = vi.fn()

    render(<ToastStack toasts={sampleToasts.slice(0, 1)} onDismiss={handleDismiss} />)

    const closeButton = screen.getByRole('button', { name: '閉じる' })
    fireEvent.click(closeButton)

    expect(handleDismiss).toHaveBeenCalledWith('1')
  })

  it('自動クローズ時間経過後に onDismiss を呼び出す', async () => {
    vi.useFakeTimers()
    const handleDismiss = vi.fn()

    render(
      <ToastStack
        toasts={sampleToasts.slice(0, 1)}
        onDismiss={handleDismiss}
        autoCloseDurationMs={TOAST_AUTO_DISMISS_MS}
      />,
    )

    expect(handleDismiss).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(TOAST_AUTO_DISMISS_MS)

    expect(handleDismiss).toHaveBeenCalledWith('1')
  })
})
