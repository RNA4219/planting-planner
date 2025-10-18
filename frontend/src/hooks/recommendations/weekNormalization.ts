import * as weekModule from '../../lib/week'

const week = weekModule as typeof import('../../lib/week')
const { normalizeIsoWeek } = week

const MS_IN_WEEK = 604800000

const getIsoWeekFromDate = (date: Date): string => {
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = thursday.getUTCDay() || 7
  thursday.setUTCDate(thursday.getUTCDate() + 4 - day)
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4))
  const diff = thursday.getTime() - firstThursday.getTime()
  const weekNumber = Math.floor(diff / MS_IN_WEEK) + 1
  const padded = Math.max(1, Math.min(weekNumber, 53)).toString().padStart(2, '0')
  return `${thursday.getUTCFullYear()}-W${padded}`
}

export const normalizeWeekInput = (value: string, activeWeek: string): string => {
  const trimmed = value.trim()
  if (trimmed) {
    const normalized = trimmed.normalize('NFKC')
    const digitMap: Record<string, string> = {
      〇: '0',
      零: '0',
      一: '1',
      二: '2',
      三: '3',
      四: '4',
      五: '5',
      六: '6',
      七: '7',
      八: '8',
      九: '9',
    }
    const normalizedDigits = normalized.replace(
      /[〇零一二三四五六七八九]/g,
      (char) => digitMap[char] ?? char,
    )
    const getIsoWeekFromDateParts = (
      year: number,
      month: number,
      day: number,
    ): string | undefined => {
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
          return getIsoWeekFromDate(utcDate)
        }
      }
      return undefined
    }

    const japaneseDateLike = normalizedDigits.match(
      /^([0-9]{4})年\s*([0-9]{1,2})月\s*([0-9]{1,2})日$/,
    )
    if (japaneseDateLike) {
      const [, yearPart, monthPart, dayPart] = japaneseDateLike
      const isoWeek = getIsoWeekFromDateParts(Number(yearPart), Number(monthPart), Number(dayPart))
      if (isoWeek) return isoWeek
    }

    const dateLike = normalizedDigits.match(/^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})$/)
    if (dateLike) {
      const [, yearPart, , monthPart, dayPart] = dateLike
      const isoWeek = getIsoWeekFromDateParts(Number(yearPart), Number(monthPart), Number(dayPart))
      if (isoWeek) return isoWeek
    }

    const upper = normalizedDigits.toUpperCase()
    const weekFirstMatch = upper.match(/^\D*(\d{1,2})\D+(\d{4})(?:年)?$/)
    if (weekFirstMatch) {
      const weekPart = weekFirstMatch[1]
      const yearPart = weekFirstMatch[2]
      if (weekPart && yearPart)
        return normalizeIsoWeek(`${yearPart}-W${weekPart.padStart(2, '0')}`, activeWeek)
    }

    const englishLeadingMatch = upper.match(/^W(?:EEK|KS?)?\D*(\d{1,2})\D+(\d{4})$/)
    if (englishLeadingMatch) {
      const weekPart = englishLeadingMatch[1]
      const yearPart = englishLeadingMatch[2]
      if (weekPart && yearPart)
        return normalizeIsoWeek(`${yearPart}-W${weekPart.padStart(2, '0')}`, activeWeek)
    }

    const digits = upper.replace(/[^0-9]/g, '')
    if (digits.length >= 5 && digits.length <= 6) {
      const normalizeFromParts = (yearPart: string, weekPart: string) => {
        if (yearPart.length === 4 && weekPart) {
          return normalizeIsoWeek(`${yearPart}-W${weekPart.padStart(2, '0')}`, activeWeek)
        }
        return undefined
      }

      const fromYearLeading = normalizeFromParts(digits.slice(0, 4), digits.slice(4))
      if (fromYearLeading) return fromYearLeading

      const fromWeekLeading = normalizeFromParts(
        digits.slice(-4),
        digits.slice(0, digits.length - 4),
      )
      if (fromWeekLeading) return fromWeekLeading
    }
  }
  return normalizeIsoWeek(value, activeWeek)
}
