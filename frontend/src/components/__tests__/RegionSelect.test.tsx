import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RegionSelect } from '../RegionSelect'

describe('RegionSelect', () => {
  it('地域変更時に onChange を 1 度だけ呼び出す', () => {
    const handleChange = vi.fn()

    render(<RegionSelect onChange={handleChange} />)

    expect(handleChange).toHaveBeenCalledTimes(1)

    const select = screen.getByLabelText('地域') as HTMLSelectElement

    fireEvent.change(select, { target: { value: 'warm' } })

    expect(handleChange).toHaveBeenCalledTimes(2)
    expect(handleChange).toHaveBeenLastCalledWith('warm')
  })
})
