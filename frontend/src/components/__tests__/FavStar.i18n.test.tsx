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

type Scenario = {
  readonly name: string
  readonly initialLang: 'ja' | 'en'
  readonly featureFlag: boolean | undefined
  readonly href: string
  readonly cropName: string
  readonly expectedAddLabel: string
  readonly expectedRemoveLabel: string
  readonly expectedResolvedLang: 'ja' | 'en'
}

const SCENARIOS: readonly Scenario[] = [
  {
    name: '日本語設定',
    initialLang: 'ja',
    featureFlag: false,
    href: DEFAULT_URL,
    cropName: 'トマト',
    expectedAddLabel: 'トマトをお気に入りに追加',
    expectedRemoveLabel: 'トマトをお気に入りから外す',
    expectedResolvedLang: 'ja',
  },
  {
    name: '英語設定',
    initialLang: 'en',
    featureFlag: true,
    href: 'http://localhost/?lang=en',
    cropName: 'Tomato',
    expectedAddLabel: 'Add Tomato to favorites',
    expectedRemoveLabel: 'Remove Tomato from favorites',
    expectedResolvedLang: 'en',
  },
  {
    name: '英語無効時は日本語にフォールバック',
    initialLang: 'en',
    featureFlag: false,
    href: 'http://localhost/?lang=en',
    cropName: 'トマト',
    expectedAddLabel: 'トマトをお気に入りに追加',
    expectedRemoveLabel: 'トマトをお気に入りから外す',
    expectedResolvedLang: 'ja',
  },
]

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

  describe.each(SCENARIOS)(
    '$name',
    ({
      initialLang,
      featureFlag,
      href,
      cropName,
      expectedAddLabel,
      expectedRemoveLabel,
      expectedResolvedLang,
    }) => {
      it('トグル時の aria-label が適切に切り替わる', async () => {
        setLocale(initialLang, featureFlag)
        stubLocation(href)

        const { FavStar } = await import('../FavStar')

        const { rerender } = render(
          <FavStar active={false} cropName={cropName} onToggle={() => {}} />,
        )

        expect(document.documentElement.lang).toBe(expectedResolvedLang)

        expect(screen.getByRole('button', { name: expectedAddLabel })).toBeInTheDocument()

        rerender(<FavStar active cropName={cropName} onToggle={() => {}} />)

        expect(screen.getByRole('button', { name: expectedRemoveLabel })).toBeInTheDocument()
      })
    },
  )
})
