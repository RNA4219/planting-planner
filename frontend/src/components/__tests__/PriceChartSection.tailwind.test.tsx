import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PriceChartSection } from '../PriceChartSection'

describe('PriceChartSection (tailwind)', () => {
  afterEach(() => {
    cleanup()
  })

  it('セクションに Tailwind の余白クラスを適用する', () => {
    render(<PriceChartSection selectedCropId={null} marketScope="national" />)

    const heading = screen.getByRole('heading', { level: 2, name: '価格推移' })
    const section = heading.closest('section')

    expect(section).not.toBeNull()
    if (section == null) {
      throw new Error('セクションが見つかりません')
    }

    expect(section).toHaveClass('mt-8')
  })

  it('補足文に Tailwind の文字装飾クラスを適用する', () => {
    render(<PriceChartSection selectedCropId={null} marketScope="national" />)

    const hint = screen.getByText('作物一覧で行をクリックすると、価格推移が表示されます。')

    expect(hint).toHaveClass('mt-2')
    expect(hint).toHaveClass('text-sm')
    expect(hint).toHaveClass('text-slate-500')
  })
})
