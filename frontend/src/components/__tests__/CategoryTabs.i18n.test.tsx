import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FeatureFlagConfig } from '../../constants/messages'

import { CategoryTabs } from '../CategoryTabs'

declare global {
  // eslint-disable-next-line no-var
  var FEATURE_FLAGS: FeatureFlagConfig | undefined
}

const setLocale = (lang: string) => {
  document.documentElement.lang = lang
}

const setRuntimeFlag = (flag: boolean | undefined) => {
  if (typeof flag === 'undefined') {
    delete (globalThis as { FEATURE_FLAGS?: FeatureFlagConfig }).FEATURE_FLAGS
    return
  }

  ;(globalThis as { FEATURE_FLAGS?: FeatureFlagConfig }).FEATURE_FLAGS = {
    I18N_EN: flag,
  }
}

describe('CategoryTabs i18n', () => {
  afterEach(() => {
    cleanup()
    setLocale('ja')
    setRuntimeFlag(undefined)
    vi.unstubAllEnvs()
  })

  it('既定では日本語タブラベルを表示する', () => {
    setLocale('ja')
    setRuntimeFlag(undefined)

    render(<CategoryTabs category="leaf" onChange={() => {}} />)

    const tablist = screen.getByRole('tablist')
    expect(tablist).toHaveAttribute('aria-label', 'カテゴリ')
    expect(screen.getByRole('tab', { name: '葉菜' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '根菜' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '花き' })).toBeInTheDocument()
  })

  it('英語設定時は英語タブラベルを表示する', () => {
    setLocale('en')
    setRuntimeFlag(true)

    render(<CategoryTabs category="leaf" onChange={() => {}} />)

    const tablist = screen.getByRole('tablist')
    expect(tablist).toHaveAttribute('aria-label', 'Category')
    expect(screen.getByRole('tab', { name: 'Leafy vegetables' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Root vegetables' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Flower crops' })).toBeInTheDocument()
  })

  it('環境変数で英語が有効な場合は英語タブラベルを表示する', () => {
    setLocale('en')
    setRuntimeFlag(undefined)
    vi.stubEnv('VITE_I18N_EN', 'true')

    render(<CategoryTabs category="leaf" onChange={() => {}} />)

    const tablist = screen.getByRole('tablist')
    expect(tablist).toHaveAttribute('aria-label', 'Category')
    expect(screen.getByRole('tab', { name: 'Leafy vegetables' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Root vegetables' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Flower crops' })).toBeInTheDocument()
  })

  it('後始末でロケール設定をリセットする', () => {
    expect(document.documentElement.lang).toBe('ja')
    expect((globalThis as { FEATURE_FLAGS?: FeatureFlagConfig }).FEATURE_FLAGS).toBeUndefined()
  })
})
