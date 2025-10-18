import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ToastStack } from '../../src/components/ToastStack'

describe('ToastStack', () => {
  test('単一トースト表示時は aria-live="polite"', () => {
    const { getByTestId } = render(
      <ToastStack
        toasts={[
          {
            id: 'toast-1',
            variant: 'info',
            message: 'hello',
          },
        ]}
      />,
    )

    const stack = getByTestId('toast-stack')
    expect(stack).toHaveAttribute('role', 'status')
    expect(stack).toHaveAttribute('aria-live', 'polite')
    expect(Array.from(stack.classList).some((className) => className.startsWith('toast'))).toBe(
      false,
    )
  })
})
