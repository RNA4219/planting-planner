const getThursday = (date: Date): Date => {
  const clone = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = clone.getUTCDay() || 7
  clone.setUTCDate(clone.getUTCDate() + 4 - day)
  return clone
}

export const getCurrentIsoWeek = (now = new Date()): number => {
  const thursday = getThursday(now)
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((Number(thursday) - Number(yearStart)) / 86400000 + 1) / 7)
  return thursday.getUTCFullYear() * 100 + week
}

export const formatIsoWeek = (isoWeek: number): string => {
  const year = Math.floor(isoWeek / 100)
  const week = isoWeek % 100
  const padded = week.toString().padStart(2, '0')
  return `${year}年 第${padded}週`
}

export const parseIsoWeek = (isoWeek: number): { year: number; week: number } => {
  const year = Math.floor(isoWeek / 100)
  const week = isoWeek % 100
  return { year, week }
}
