import { ChangeEvent, useEffect, useState } from 'react'

import type { FeatureFlagConfig } from '../constants/messages'
import { loadRegion, saveRegion } from '../lib/storage'
import type { Region, RegionOption } from '../types'

type Locale = 'ja' | 'en'

type RegionTextDictionary = {
  readonly label: string
  readonly options: readonly RegionOption[]
}

const REGION_TEXT_DICTIONARY: Record<Locale, RegionTextDictionary> = {
  ja: {
    label: '地域',
    options: [
      { value: 'cold', label: '寒冷地' },
      { value: 'temperate', label: '温暖地' },
      { value: 'warm', label: '暖地' },
    ],
  },
  en: {
    label: 'Region',
    options: [
      { value: 'cold', label: 'Cold region' },
      { value: 'temperate', label: 'Temperate region' },
      { value: 'warm', label: 'Warm region' },
    ],
  },
}

const resolveLocale = (): Locale => {
  if (typeof document === 'undefined') {
    return 'ja'
  }

  const lang = document.documentElement.lang?.toLowerCase() ?? ''

  if (!lang.startsWith('en')) {
    return 'ja'
  }

  const flag = (globalThis as { FEATURE_FLAGS?: FeatureFlagConfig }).FEATURE_FLAGS?.I18N_EN

  return flag === true ? 'en' : 'ja'
}

interface Props {
  onChange: (region: Region) => void
  options?: RegionOption[]
  disabled?: boolean
}

export const RegionSelect = ({ onChange, options, disabled }: Props) => {
  const locale = resolveLocale()
  const dictionary = REGION_TEXT_DICTIONARY[locale]
  const resolvedOptions: readonly RegionOption[] = options ?? dictionary.options
  const [selected, setSelected] = useState<Region>(() => loadRegion())

  useEffect(() => {
    onChange(selected)
  }, [onChange, selected])

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as Region
    setSelected(next)
    saveRegion(next)
  }

  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      <span>{dictionary.label}</span>
      <select
        aria-label={dictionary.label}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-market-accent focus:outline-none focus:ring-2 focus:ring-market-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100"
        name="region"
        value={selected}
        onChange={handleChange}
        disabled={disabled}
      >
        {resolvedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

RegionSelect.displayName = 'RegionSelect'
