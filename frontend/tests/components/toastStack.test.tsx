import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { ToastStack } from '../../src/components/ToastStack'

describe('ToastStack', () => {
  test('単一トースト表示時は aria-live="polite"', () => {
    const { container } = render(
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

    const stack = container.querySelector('.toast-stack')
    expect(stack).not.toBeNull()
    expect(stack).toHaveAttribute('aria-live', 'polite')
  })
})
