import { describe, expect, test } from 'vitest'
import resolveConfig from 'tailwindcss/resolveConfig'
import defaultConfig from 'tailwindcss/defaultConfig'

import type { Config } from 'tailwindcss'

type ThemeToken = {
  readonly token: string
  readonly hex_color: string
}

const themeTokensModule = (await import('../../data/theme_tokens.json', {
  assert: { type: 'json' }
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

const REQUIRED_MARKET_SCOPE_TOKENS = ['market.national', 'market.city'] as const

const marketScopesModule = (await import('../src/constants/marketScopes')) as {
  MARKET_SCOPE_FALLBACK_DEFINITIONS: ReadonlyArray<{
    readonly scope: string
    readonly theme: { readonly token: string }
  }>
}

const marketScopeFallbacks = marketScopesModule.MARKET_SCOPE_FALLBACK_DEFINITIONS

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

  test('market scope tokens are available', () => {
    const tokens = new Set(themeTokens.map((token) => token.token))
    REQUIRED_MARKET_SCOPE_TOKENS.forEach((token) => {
      expect(tokens.has(token)).toBe(true)
    })
  })

  test('market scope fallbacks use market tokens', () => {
    marketScopeFallbacks.forEach((definition) => {
      if (definition.scope === 'national') {
        expect(definition.theme.token).toBe('market.national')
        return
      }

      if (definition.scope.startsWith('city:')) {
        expect(definition.theme.token).toBe('market.city')
        return
      }

      expect(definition.theme.token.startsWith('market.')).toBe(true)
    })
  })

  test('aria variants are enabled', () => {
    expect(tailwindConfig.theme.aria).toEqual(defaultConfig.theme?.aria)
  })
})
