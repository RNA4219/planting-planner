import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

import type { FeatureFlagConfig } from '../../constants/messages'

declare global {
  // eslint-disable-next-line no-var
  var FEATURE_FLAGS: FeatureFlagConfig | undefined
}

const DEFAULT_URL = 'http://localhost/'
const ORIGINAL_LOCATION = window.location

const stubLocation = (href: string) => {
  const url = new URL(href)
  const stub = Object.assign(new URL(url.href), {
    assign: () => {},
    reload: () => {},
    replace: () => {},
  }) as unknown as Location

  Object.defineProperty(window, 'location', { configurable: true, value: stub })
}

const setLocale = (lang: string, flag: boolean | undefined) => {
  document.documentElement.lang = lang

  if (typeof flag === 'undefined') {
    delete (globalThis as { FEATURE_FLAGS?: FeatureFlagConfig }).FEATURE_FLAGS
    return
  }

  ;(globalThis as { FEATURE_FLAGS?: FeatureFlagConfig }).FEATURE_FLAGS = {
    I18N_EN: flag,
  }
}

describe('FavStar i18n', () => {
  afterEach(() => {
    cleanup()
    vi.resetModules()
    setLocale('ja', undefined)
    stubLocation(DEFAULT_URL)
  })

  afterAll(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: ORIGINAL_LOCATION })
  })

  it('日本語設定時は日本語のラベルを表示する', async () => {
    setLocale('ja', false)
    stubLocation(DEFAULT_URL)

    const { FavStar } = await import('../FavStar')

    const { rerender } = render(
      <FavStar
        active={false}
        cropName="トマト"
        onToggle={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'トマトをお気に入りに追加' })).toBeInTheDocument()

    rerender(
      <FavStar
        active
        cropName="トマト"
        onToggle={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'トマトをお気に入りから外す' })).toBeInTheDocument()
  })

  it('英語設定時は英語のラベルを表示する', async () => {
    setLocale('en', true)
    stubLocation('http://localhost/?lang=en')

    const { FavStar } = await import('../FavStar')

    const { rerender } = render(
      <FavStar
        active={false}
        cropName="Tomato"
        onToggle={() => {}}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Add Tomato to favorites' }),
    ).toBeInTheDocument()

    rerender(
      <FavStar
        active
        cropName="Tomato"
        onToggle={() => {}}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Remove Tomato from favorites' }),
    ).toBeInTheDocument()
  })
})
