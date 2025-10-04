import * as weekModule from '../../lib/week'

const week = weekModule as typeof import('../../lib/week')
const { normalizeIsoWeek, getCurrentIsoWeek } = week

export const normalizeWeekInput = (value: string, activeWeek: string): string => {
  const trimmed = value.trim()
  if (trimmed) {
    const dateLike = trimmed.match(/^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})$/)
    if (dateLike) {
      const [, yearPart, , monthPart, dayPart] = dateLike
      const year = Number(yearPart)
      const month = Number(monthPart)
      const day = Number(dayPart)
      if (
        Number.isInteger(year) &&
        Number.isInteger(month) &&
        Number.isInteger(day) &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31
      ) {
        const utcDate = new Date(Date.UTC(year, month - 1, day))
        if (
          utcDate.getUTCFullYear() === year &&
          utcDate.getUTCMonth() === month - 1 &&
          utcDate.getUTCDate() === day
        ) {
          return getCurrentIsoWeek(utcDate)
        }
      }
    }

    const upper = trimmed.toUpperCase()
    const weekFirstMatch = upper.match(/^W?(\d{1,2})\D+(\d{4})$/)
    if (weekFirstMatch) {
      const weekPart = weekFirstMatch[1]
      const yearPart = weekFirstMatch[2]
      if (weekPart && yearPart) return normalizeIsoWeek(`${yearPart}-W${weekPart.padStart(2, '0')}`, activeWeek)
    }

    const digits = upper.replace(/[^0-9]/g, '')
    if (digits.length >= 5 && digits.length <= 6) {
      const yearPart = digits.slice(0, 4)
      const weekPart = digits.slice(4)
      if (weekPart) return normalizeIsoWeek(`${yearPart}-W${weekPart.padStart(2, '0')}`, activeWeek)
    }
  }
  return normalizeIsoWeek(value, activeWeek)
}
