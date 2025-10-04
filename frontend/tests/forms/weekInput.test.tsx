import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { FormEvent } from 'react'

import { createInteractionsHarness } from '../utils/interactionsHarness'

const harness = createInteractionsHarness()

describe('Week form interactions', () => {
  test('週入力の変更で setQueryWeek が呼び出される', async () => {
    const setQueryWeek = vi.fn()
    const handleSubmit = vi.fn<(event: FormEvent<HTMLFormElement>) => void>((event) => {
      event.preventDefault()
    })

    harness.useRecommendationsSpy.mockReturnValue({
      region: 'temperate',
      setRegion: vi.fn(),
      queryWeek: '2024-W30',
      setQueryWeek,
      currentWeek: '2024-W30',
      displayWeek: '2024-W30',
      sortedRows: [],
      handleSubmit,
    })

    const App = (await import('../../src/App')).default
    render(<App />)

    const weekInput = screen.getByLabelText('週') as HTMLInputElement
    fireEvent.change(weekInput, { target: { value: '2024-W31' } })

    expect(setQueryWeek).toHaveBeenLastCalledWith('2024-W31')
  })
})
