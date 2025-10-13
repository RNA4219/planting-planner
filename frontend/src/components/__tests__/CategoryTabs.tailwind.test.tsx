import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CategoryTabs } from '../CategoryTabs'

describe('CategoryTabs (tailwind)', () => {
  it('aria-selected バリアントでスタイルが切り替わる', () => {
    render(<CategoryTabs category="leaf" onChange={vi.fn()} />)

    const tabs = screen.getAllByRole('tab')
    tabs.forEach((tab) => {
      expect(tab).toHaveClass('aria-selected:bg-market-600')
      expect(tab).toHaveClass('aria-selected:text-white')
    })

    const activeTab = screen.getByRole('tab', { selected: true })
    expect(activeTab).toHaveAttribute('aria-selected', 'true')
    expect(activeTab).toHaveClass('aria-selected:bg-market-600')
    expect(activeTab).toHaveClass('aria-selected:text-white')
  })
})
