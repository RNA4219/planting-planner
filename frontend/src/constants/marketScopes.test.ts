import { describe, expect, it } from 'vitest'

import { MARKET_SCOPE_FALLBACK_DEFINITIONS } from './marketScopes'

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
})
