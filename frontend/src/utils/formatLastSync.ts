const FALLBACK_LOCALE = 'ja-JP'
const FALLBACK_LANGUAGE = 'ja'
const DEFAULT_UNKNOWN_LABELS: Record<string, string | undefined> = {
  ja: '未同期',
  en: 'Not synced',
}
const FALLBACK_UNKNOWN_LABEL = DEFAULT_UNKNOWN_LABELS[FALLBACK_LANGUAGE] ?? '未同期'

const resolveLocale = () => {
  const candidates: string[] = []
  if (typeof document !== 'undefined') {
    const lang = document.documentElement?.lang?.trim()
    if (lang) {
      candidates.push(lang)
    }
  }
  if (typeof navigator !== 'undefined') {
    if (navigator.language) {
      candidates.push(navigator.language)
    }
    if (Array.isArray(navigator.languages)) {
      candidates.push(...navigator.languages)
    }
  }
  for (const candidate of candidates) {
    try {
      return new Intl.DateTimeFormat(candidate).resolvedOptions().locale
    } catch {
      continue
    }
  }
  return FALLBACK_LOCALE
}

const resolveUnknownLabel = (locale: string, provided?: string): string => {
  if (provided !== undefined) {
    return provided
  }
  const [language = ''] = locale.toLowerCase().split('-')
  const resolved = DEFAULT_UNKNOWN_LABELS[language]
  if (resolved !== undefined) {
    return resolved
  }
  return FALLBACK_UNKNOWN_LABEL
}

export const formatLastSync = (date: Date | null, unknownLabel?: string): string => {
  const locale = resolveLocale()
  const label = resolveUnknownLabel(locale, unknownLabel)
  if (!date) {
    return label
  }
  const timestamp = date.getTime()
  if (Number.isNaN(timestamp)) {
    return label
  }
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return formatter.format(date)
  } catch {
    return label
  }
}
