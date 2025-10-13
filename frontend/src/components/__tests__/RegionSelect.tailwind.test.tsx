import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RegionSelect } from '../RegionSelect'

describe('RegionSelect (Tailwind classes)', () => {
  it('ラベルとセレクトに Tailwind クラスが適用される', () => {
    render(<RegionSelect onChange={() => {}} />)

    const label = screen.getByText('地域').closest('label')
    expect(label).not.toBeNull()
    expect(label).toHaveClass('flex')
    expect(label).toHaveClass('flex-col')
    expect(label).toHaveClass('gap-2')
    expect(label).toHaveClass('text-sm')
    expect(label).toHaveClass('font-medium')

    const select = screen.getByLabelText('地域')
    expect(select).toHaveClass('rounded-md')
    expect(select).toHaveClass('border')
    expect(select).toHaveClass('px-3')
    expect(select).toHaveClass('py-2')
    expect(select).toHaveClass('focus:outline-none')
    expect(select).toHaveClass('focus:ring-2')
    expect(select).toHaveClass('focus:ring-green-500')
  })
})
