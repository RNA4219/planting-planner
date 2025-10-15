const ISO_WEEK_PATTERN = /^(\d{4})-W(\d{2})$/
const MS_IN_WEEK = 604800000

const clampWeek = (week: number): number => {
  if (!Number.isFinite(week)) {
    return 1
  }
  if (week < 1) return 1
  if (week > 53) return 53
  return Math.trunc(week)
}

const formatWeek = (year: number, week: number): string => {
  const padded = clampWeek(week).toString().padStart(2, '0')
  return `${year}-W${padded}`
}

const getThursday = (date: Date): Date => {
  const clone = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = clone.getUTCDay() || 7
  clone.setUTCDate(clone.getUTCDate() + 4 - day)
  return clone
}

const resolveIsoWeekParts = (date: Date): { year: number; week: number } => {
  const thursday = getThursday(date)
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4))
  const diff = thursday.getTime() - firstThursday.getTime()
  const week = Math.floor(diff / MS_IN_WEEK) + 1
  return { year: thursday.getUTCFullYear(), week }
}

const parseNormalizedWeek = (value: string): { year: number; week: number } | null => {
  const match = ISO_WEEK_PATTERN.exec(value)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const week = Number(match[2])
  if (Number.isNaN(year) || Number.isNaN(week)) {
    return null
  }
  return { year, week: clampWeek(week) }
}

export const getCurrentIsoWeek = (now = new Date()): string => {
  const { year, week } = resolveIsoWeekParts(now)
  return formatWeek(year, week)
}

export const normalizeIsoWeek = (
  value: string | number | null | undefined,
  fallback?: string,
): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const year = Math.trunc(value / 100)
    const week = value % 100
    return formatWeek(year, week)
  }

  if (typeof value !== 'string') {
    return fallback ?? getCurrentIsoWeek()
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return fallback ?? getCurrentIsoWeek()
  }

  const upper = trimmed.toUpperCase()
  const normalized = parseNormalizedWeek(upper)
  if (normalized) {
    return formatWeek(normalized.year, normalized.week)
  }

  const digits = upper.replace(/[^0-9]/g, '')
  if (digits.length === 5 || digits.length === 6) {
    const year = Number(digits.slice(0, 4))
    const week = Number(digits.slice(4))
    if (!Number.isNaN(year) && !Number.isNaN(week)) {
      return formatWeek(year, week)
    }
  }

  return fallback ?? getCurrentIsoWeek()
}

const toParts = (value: string): { year: number; week: number } => {
  const normalized = normalizeIsoWeek(value)
  const parts = parseNormalizedWeek(normalized)
  if (!parts) {
    const fallback = parseNormalizedWeek(getCurrentIsoWeek())
    if (!fallback) {
      throw new Error('Failed to resolve ISO week')
    }
    return fallback
  }
  return parts
}

export const compareIsoWeek = (a: string, b: string): number => {
  const left = toParts(a)
  const right = toParts(b)
  if (left.year !== right.year) {
    return left.year - right.year
  }
  return left.week - right.week
}

export const formatIsoWeek = (value: string): string => normalizeIsoWeek(value)

export const ISO_WEEK_REGEX = ISO_WEEK_PATTERN
