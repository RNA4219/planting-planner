import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FavStar } from '../FavStar'

const BASE_CLASSES = [
  'inline-flex',
  'items-center',
  'justify-center',
  'text-xl',
  'leading-none',
  'transition-colors',
  'duration-200',
  'bg-transparent',
  'border-0',
  'cursor-pointer',
  'p-0',
  'hover:text-amber-400',
  'focus-visible:text-amber-400',
  'focus-visible:outline-none',
  'focus-visible:ring-2',
  'focus-visible:ring-amber-300',
]

describe('FavStar (Tailwind)', () => {
  it('aria-pressed=false のとき非アクティブ用クラスを適用', () => {
    render(<FavStar active={false} cropName="トマト" onToggle={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'トマトをお気に入りに追加' })

    BASE_CLASSES.forEach((className) => {
      expect(button).toHaveClass(className)
    })
    expect(button).toHaveClass('text-slate-300')
    expect(button).not.toHaveClass('text-amber-400')
  })

  it('aria-pressed=true のときアクティブ用クラスへ切り替え', () => {
    render(<FavStar active cropName="トマト" onToggle={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'トマトをお気に入りから外す' })

    BASE_CLASSES.forEach((className) => {
      expect(button).toHaveClass(className)
    })
    expect(button).toHaveClass('text-amber-400')
    expect(button).not.toHaveClass('text-slate-300')
  })
})
