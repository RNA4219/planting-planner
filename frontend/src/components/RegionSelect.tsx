import { ChangeEvent, useEffect, useState } from 'react'

import { loadRegion, saveRegion } from '../lib/storage'
import type { Region, RegionOption } from '../types'

const DEFAULT_OPTIONS: RegionOption[] = [
  { value: 'cold', label: '寒冷地' },
  { value: 'temperate', label: '温暖地' },
  { value: 'warm', label: '暖地' },
]

interface Props {
  onChange: (region: Region) => void
  options?: RegionOption[]
  disabled?: boolean
}

export const RegionSelect = ({ onChange, options = DEFAULT_OPTIONS, disabled }: Props) => {
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
      <span>地域</span>
      <select
        aria-label="地域"
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100"
        name="region"
        value={selected}
        onChange={handleChange}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

RegionSelect.displayName = 'RegionSelect'
