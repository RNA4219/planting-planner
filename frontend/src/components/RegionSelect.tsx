import type { ChangeEvent } from 'react'

import type { Region, RegionOption } from '../types'

const DEFAULT_OPTIONS: RegionOption[] = [
  { value: 'cold', label: '寒冷地' },
  { value: 'temperate', label: '温暖地' },
  { value: 'warm', label: '暖地' },
]

interface Props {
  value: Region
  onChange: (region: Region) => void
  options?: RegionOption[]
  disabled?: boolean
}

export const RegionSelect = ({ value, onChange, options = DEFAULT_OPTIONS, disabled }: Props) => {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as Region)
  }

  return (
    <label className="region-select">
      <span className="region-select__label">地域</span>
      <select
        aria-label="地域"
        className="region-select__select"
        value={value}
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
