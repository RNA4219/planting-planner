import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SearchControls } from '../SearchControls'

const createProps = () => ({
  queryWeek: '2024-W01',
  currentWeek: '2024-W20',
  onWeekChange: vi.fn(),
  onRegionChange: vi.fn(),
  marketScope: 'national' as const,
  onMarketScopeChange: vi.fn(),
  searchKeyword: 'トマト',
  onSearchChange: vi.fn(),
  onSubmit: vi.fn(),
  onRefresh: vi.fn(),
  refreshing: false,
})

describe('SearchControls', () => {
  it('週入力の inputMode が text または未指定で、pattern が YYYY-Www を維持する', () => {
    render(<SearchControls {...createProps()} />)

    const weekInput = screen.getByLabelText('週') as HTMLInputElement

    expect(weekInput).toHaveAttribute('pattern', '\\d{4}-W\\d{2}')

    const inputMode = weekInput.getAttribute('inputmode')
    expect(inputMode === null || inputMode === 'text').toBe(true)
  })
})
