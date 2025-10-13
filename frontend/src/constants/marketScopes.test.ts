import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { MARKET_SCOPE_FALLBACK_DEFINITIONS } from './marketScopes'

type ThemeToken = {
  token: string
  hex_color: string
  text_color: string
}

const themeTokensPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../data/theme_tokens.json',
)

const themeTokens: ThemeToken[] = JSON.parse(readFileSync(themeTokensPath, 'utf-8'))
const themeTokensByName = new Map(themeTokens.map((themeToken) => [themeToken.token, themeToken]))

const resolveMarketThemeToken = (
  scope: string,
  fallbackToken: string,
): ThemeToken | undefined => {
  const candidates = new Set<string>([fallbackToken, fallbackToken.replaceAll('-', '.')])

  if (scope === 'national') {
    candidates.add('market.national')
  } else if (scope.startsWith('city:')) {
    candidates.add('market.city')
  }

  for (const candidate of candidates) {
    const themeToken = themeTokensByName.get(candidate)
    if (themeToken && candidate.startsWith('market.')) {
      return themeToken
    }
  }

  return undefined
}

describe('MARKET_SCOPE_FALLBACK_DEFINITIONS', () => {
  it('テーマ情報を含むフォールバック定義を提供する', () => {
    expect(MARKET_SCOPE_FALLBACK_DEFINITIONS).not.toHaveLength(0)

    for (const definition of MARKET_SCOPE_FALLBACK_DEFINITIONS) {
      expect(definition).toHaveProperty('scope')
      expect(definition).toHaveProperty('displayName')
      expect(definition).toHaveProperty('theme')
      expect(definition.theme).toEqual(
        expect.objectContaining({
          token: expect.any(String),
          hex: expect.any(String),
          text: expect.any(String),
        }),
      )
    }
  })

  it('market系テーマトークンの配色がテーマ定義と一致する', () => {
    for (const definition of MARKET_SCOPE_FALLBACK_DEFINITIONS) {
      const themeToken = resolveMarketThemeToken(definition.scope, definition.theme.token)

      if (!themeToken) {
        continue
      }

      expect(definition.theme.hex).toBe(themeToken.hex_color)
      expect(definition.theme.text).toBe(themeToken.text_color)
    }
  })
})
