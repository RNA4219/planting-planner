import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { RegionSelect } from '../RegionSelect'

type FeatureFlagConfig = { I18N_EN?: boolean }

declare global {
  // eslint-disable-next-line no-var
  var FEATURE_FLAGS: FeatureFlagConfig | undefined
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

describe('RegionSelect i18n', () => {
  afterEach(() => {
    cleanup()
    setLocale('ja', undefined)
  })

  it('日本語設定時は日本語ラベルと選択肢を表示する', () => {
    setLocale('ja', false)

    render(<RegionSelect onChange={() => {}} />)

    expect(screen.getByText('地域')).toBeInTheDocument()
    const select = screen.getByRole('combobox')
    expect(select).toHaveAttribute('aria-label', '地域')
    expect(screen.getByRole('option', { name: '寒冷地' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '温暖地' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '暖地' })).toBeInTheDocument()
  })

  it('英語設定時は英語ラベルと選択肢を表示する', () => {
    setLocale('en', true)

    render(<RegionSelect onChange={() => {}} />)

    expect(screen.getByText('Region')).toBeInTheDocument()
    const select = screen.getByRole('combobox')
    expect(select).toHaveAttribute('aria-label', 'Region')
    expect(screen.getByRole('option', { name: 'Cold region' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Temperate region' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Warm region' })).toBeInTheDocument()
  })
})
