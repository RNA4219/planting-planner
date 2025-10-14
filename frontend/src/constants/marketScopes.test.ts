import { describe, expect, it } from 'vitest'

import marketScopeDataset from '../../../data/market_scopes.json'
import themeTokenDataset from '../../../data/theme_tokens.json'
import { MARKET_SCOPE_FALLBACK_DEFINITIONS } from './marketScopes'
import type { MarketScope } from '../types'

type MarketScopeJsonEntry = {
  scope: MarketScope
  display_name: string
  theme_token: string
}

type ThemeTokenJsonEntry = {
  token: string
  hex_color: string
  text_color: string
}

const normalizeThemeToken = (token: string): string => {
  const baseToken = token.startsWith('accent.')
    ? `market-${token.slice('accent.'.length)}`
    : token

  return baseToken.replaceAll('.', '-')
}

const themeTokensByNormalizedToken = new Map(
  (themeTokenDataset as ThemeTokenJsonEntry[]).map((entry) => [
    normalizeThemeToken(entry.token),
    entry,
  ]),
)

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

  it('標準カテゴリ定義を categories に保持する', () => {
    expect(MARKET_SCOPE_FALLBACK_DEFINITIONS).not.toHaveLength(0)

    for (const definition of MARKET_SCOPE_FALLBACK_DEFINITIONS) {
      expect(definition).toHaveProperty('categories')
      expect(definition.categories).toBeDefined()

      const categories = definition.categories
      if (categories === undefined) {
        throw new Error('categories must be defined')
      }

      expect(Array.isArray(categories)).toBe(true)
      expect(categories).toHaveLength(3)

      const categoriesById = new Map(
        categories.map((category) => [category.category, category]),
      )

      expect(categoriesById.has('leaf')).toBe(true)
      expect(categoriesById.has('root')).toBe(true)
      expect(categoriesById.has('flower')).toBe(true)

      expect(categoriesById.get('leaf')).toEqual(
        expect.objectContaining({
          displayName: expect.any(String),
        }),
      )
      expect(categoriesById.get('root')).toEqual(
        expect.objectContaining({
          displayName: expect.any(String),
        }),
      )
      expect(categoriesById.get('flower')).toEqual(
        expect.objectContaining({
          displayName: expect.any(String),
        }),
      )
    }
  })

  it('JSON 定義とフォールバック定義が 1 対 1 で一致する', () => {
    const jsonDefinitions = (marketScopeDataset as MarketScopeJsonEntry[]).map(
      (entry) => ({
        scope: entry.scope,
        displayName: entry.display_name,
        themeToken: entry.theme_token,
      }),
    )

    expect(jsonDefinitions).not.toHaveLength(0)
    expect(MARKET_SCOPE_FALLBACK_DEFINITIONS).toHaveLength(
      jsonDefinitions.length,
    )

    const fallbackByScope = new Map(
      MARKET_SCOPE_FALLBACK_DEFINITIONS.map((definition) => [
        definition.scope,
        definition,
      ]),
    )

    for (const jsonDefinition of jsonDefinitions) {
      const fallbackDefinition = fallbackByScope.get(jsonDefinition.scope)

      expect(fallbackDefinition).toBeDefined()

      expect(fallbackDefinition?.displayName).toBe(jsonDefinition.displayName)
      const normalizedToken = normalizeThemeToken(jsonDefinition.themeToken)

      expect(fallbackDefinition?.theme.token).toBe(normalizedToken)

      const themeTokenDefinition = themeTokensByNormalizedToken.get(
        normalizedToken,
      )

      if (
        themeTokenDefinition !== undefined &&
        !themeTokenDefinition.token.startsWith('accent.')
      ) {
        expect(fallbackDefinition?.theme.text).toBe(
          themeTokenDefinition.text_color,
        )
      }
    }
  })
})
