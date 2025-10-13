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

const expectedMarketColors = themeTokens.reduce<Record<string, Record<string, string>>>((acc, token) => {
  const [group, name] = token.token.split('.')
  if (!acc[group]) {
    acc[group] = {}
  }
  acc[group][name] = token.hex_color
  return acc
}, {})

const tailwindConfigModule = (await import('../tailwind.config')) as { default: Config }
const tailwindConfig = resolveConfig(tailwindConfigModule.default)

describe('tailwind config', () => {
  test('market colors match theme tokens', () => {
    expect(tailwindConfig.theme.colors?.market).toEqual(expectedMarketColors)
  })

  test('aria variants are enabled', () => {
    expect(tailwindConfig.theme.aria).toEqual(defaultConfig.theme?.aria)
  })
})
