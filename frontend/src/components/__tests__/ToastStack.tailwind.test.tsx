import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ToastStack } from '../ToastStack'

describe('ToastStack (Tailwind)', () => {
  it('variant ごとに Tailwind クラスを適用し、aria-live="polite" を維持する', () => {
    const toasts = [
      { id: '1', variant: 'success' as const, message: '更新が完了しました' },
      { id: '2', variant: 'error' as const, message: '更新に失敗しました' },
      { id: '3', variant: 'warning' as const, message: '注意してください' },
      { id: '4', variant: 'info' as const, message: '通知があります' },
    ]

    render(<ToastStack toasts={toasts} onDismiss={() => {}} />)

    const stack = screen.getByRole('status')
    expect(stack).toHaveAttribute('aria-live', 'polite')

    const alerts = screen.getAllByRole('alert')
    toasts.forEach((toast, index) => {
      expect(alerts[index]).toHaveClass(`bg-market-${toast.variant}`)
      expect(alerts[index]).toHaveClass('text-white')
    })
  })
})
