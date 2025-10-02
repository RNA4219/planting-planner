import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import type { FormEvent } from 'react'

import { resetAppSpies } from './utils/renderApp'

type UseRecommendationsModule = typeof import('../src/hooks/useRecommendations')

describe('App interactions', () => {
  let useRecommendationsModule: UseRecommendationsModule
  let useRecommendationsSpy: MockInstance

  beforeEach(async () => {
    resetAppSpies()
    useRecommendationsModule = await import('../src/hooks/useRecommendations')
    useRecommendationsSpy = vi.spyOn(useRecommendationsModule, 'useRecommendations')
  })

  afterEach(() => {
    useRecommendationsSpy.mockRestore()
    cleanup()
    resetAppSpies()
  })

  test('週入力の変更で setQueryWeek が呼び出される', async () => {
    const setQueryWeek = vi.fn()
    const handleSubmit = vi.fn<(event: FormEvent<HTMLFormElement>) => void>((event) => {
      event.preventDefault()
    })

    useRecommendationsSpy.mockReturnValue({
      region: 'temperate',
      setRegion: vi.fn(),
      queryWeek: '2024-W30',
      setQueryWeek,
      currentWeek: '2024-W30',
      displayWeek: '2024-W30',
      sortedRows: [],
      handleSubmit,
    })

    const App = (await import('../src/App')).default
    render(<App />)

    const weekInput = screen.getByLabelText('週') as HTMLInputElement
    fireEvent.change(weekInput, { target: { value: '2024-W31' } })

    expect(setQueryWeek).toHaveBeenLastCalledWith('2024-W31')
  })
})
