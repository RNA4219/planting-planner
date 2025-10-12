import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CategoryTabs } from '../src/components/CategoryTabs'
import type { CropCategory } from '../src/types'

const LABELS: Record<CropCategory, string> = {
  leaf: '葉菜',
  root: '根菜',
  flower: '花き',
  fruit: '果菜',
}

describe('CategoryTabs', () => {
  it("renders the fruit tab and calls onChange('fruit') when clicked", async () => {
    const onChange = vi.fn()

    render(<CategoryTabs category="leaf" onChange={onChange} />)

    const fruitTab = screen.getByRole('tab', { name: LABELS.fruit })
    expect(fruitTab).toBeInTheDocument()

    await userEvent.click(fruitTab)

    expect(onChange).toHaveBeenCalledWith('fruit')

    ;(Object.entries(LABELS) as Array<[CropCategory, string]>).forEach(([, label]) => {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument()
    })
  })
})
