import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PriceChartSection } from '../PriceChartSection'

describe('PriceChartSection (tailwind)', () => {
  afterEach(() => {
    cleanup()
  })

  it('セクションにカード風レイアウトの Tailwind クラスを適用する', () => {
    render(<PriceChartSection selectedCropId={null} marketScope="national" />)

    const heading = screen.getByRole('heading', { level: 2, name: '価格推移' })
    const section = heading.closest('section')

    expect(section).not.toBeNull()
    if (section == null) {
      throw new Error('セクションが見つかりません')
    }

    expect(section).toHaveClass('space-y-4')
    expect(section).toHaveClass('rounded-3xl')
    expect(section).toHaveClass('border')
    expect(section).toHaveClass('border-white/60')
    expect(section).toHaveClass('bg-white/80')
    expect(section).toHaveClass('p-6')
    expect(section).toHaveClass('shadow-sm')
    expect(section).toHaveClass('backdrop-blur-sm')
  })

  it('補足文に Tailwind の文字装飾クラスを適用する', () => {
    render(<PriceChartSection selectedCropId={null} marketScope="national" />)

    const hint = screen.getByText('作物一覧で行をクリックすると、価格推移が表示されます。')

    expect(hint).toHaveClass('text-sm')
    expect(hint).toHaveClass('text-slate-500')
    expect(hint).not.toHaveClass('mt-2')
  })
})
