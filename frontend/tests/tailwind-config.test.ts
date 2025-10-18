import { describe, expect, test } from 'vitest'
import resolveConfig from 'tailwindcss/resolveConfig'
import defaultConfig from 'tailwindcss/defaultConfig'

import type { Config } from 'tailwindcss'

type ThemeToken = {
  readonly token: string
  readonly hex_color: string
}

const themeTokensModule = (await import('../../data/theme_tokens.json', {
  assert: { type: 'json' },
})) as { default: readonly ThemeToken[] }
const themeTokens = themeTokensModule.default

const expectedMarketColors = themeTokens.reduce<Record<string, string>>((acc, token) => {
  const [prefix, ...segments] = token.token.split('.')
  if (prefix !== 'market' || segments.length === 0) {
    return acc
  }
  const name = segments.join('-')
  acc[name] = token.hex_color
  return acc
}, {})

const tailwindConfigModule = (await import('../tailwind.config')) as { default: Config }
const tailwindConfig = resolveConfig(tailwindConfigModule.default)
const marketColors = tailwindConfig.theme.colors?.market

const REQUIRED_MARKET_COLOR_KEYS = [
  'success',
  'error',
  'warning',
  'info',
  'neutral',
  'neutral-container',
  'neutral-hover',
  'neutral-strong',
  'accent',
  'national',
  'city',
] as const

describe('tailwind config', () => {
  test('market colors match theme tokens', () => {
    expect(tailwindConfig.theme.colors?.market).toEqual(expectedMarketColors)
  })

  test('market colors cover UI keys', () => {
    expect.hasAssertions()
    expect(marketColors).toBeDefined()
    REQUIRED_MARKET_COLOR_KEYS.forEach((key) => {
      expect(marketColors).toHaveProperty(key)
    })
  })

  test('aria variants are enabled', () => {
    expect(tailwindConfig.theme.aria).toEqual(defaultConfig.theme?.aria)
  })

  test('safelist includes market background classes', () => {
    expect.hasAssertions()
    const safelist = tailwindConfig.safelist
    expect(Array.isArray(safelist)).toBe(true)
    const expectedClasses = Object.keys(expectedMarketColors).map((name) => `bg-market-${name}`)

    expectedClasses.forEach((className) => {
      expect(safelist).toContain(className)
    })
  })
})
