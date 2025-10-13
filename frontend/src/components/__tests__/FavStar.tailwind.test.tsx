import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FavStar, FAV_STAR_BASE_CLASS_LIST } from '../FavStar'

describe('FavStar (Tailwind)', () => {
  it('aria-pressed=false のとき非アクティブ用クラスを適用', () => {
    render(<FavStar active={false} cropName="トマト" onToggle={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'トマトをお気に入りに追加' })

    FAV_STAR_BASE_CLASS_LIST.forEach((className) => {
      expect(button).toHaveClass(className)
    })
    expect(button).toHaveClass('text-slate-300')
    expect(button).not.toHaveClass('text-amber-400')
  })

  it('aria-pressed=true のときアクティブ用クラスへ切り替え', () => {
    render(<FavStar active cropName="トマト" onToggle={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'トマトをお気に入りから外す' })

    FAV_STAR_BASE_CLASS_LIST.forEach((className) => {
      expect(button).toHaveClass(className)
    })
    expect(button).toHaveClass('text-amber-400')
    expect(button).not.toHaveClass('text-slate-300')
  })
})
