import { APP_TEXT } from '../constants/messages'
import { MARKET_SCOPE_FALLBACK_DEFINITIONS } from '../constants/marketScopes'
import type { CropCategory, MarketScope, Region } from '../types'

export type ShareResult = 'success' | 'copied' | 'error'

type ShareLanguage = 'ja' | 'en'

const SHARE_LANGUAGE_FALLBACK: readonly ShareLanguage[] = ['ja', 'en']

const resolveShareLanguage = (): ShareLanguage => {
  if (typeof document !== 'undefined') {
    const lang = document.documentElement?.lang?.toLowerCase()
    if (lang === 'en') {
      return 'en'
    }
  }
  return 'ja'
}

const buildLanguageFallbackOrder = (language: ShareLanguage): ShareLanguage[] => {
  const fallback = SHARE_LANGUAGE_FALLBACK.filter((entry) => entry !== language)
  return [language, ...fallback]
}

const REGION_LABEL_DICTIONARY: Record<ShareLanguage, Record<Region, string>> = {
  ja: {
    cold: '寒冷地',
    temperate: '温暖地',
    warm: '暖地',
  },
  en: {
    cold: 'Cold region',
    temperate: 'Temperate region',
    warm: 'Warm region',
  },
}

const CATEGORY_LABEL_DICTIONARY: Record<ShareLanguage, Record<CropCategory, string>> = {
  ja: {
    leaf: '葉菜類',
    root: '根菜類',
    flower: '花き類',
  },
  en: {
    leaf: 'Leafy vegetables',
    root: 'Root vegetables',
    flower: 'Flower crops',
  },
}

const MARKET_LABEL_FALLBACK_DICTIONARY: Record<
  ShareLanguage,
  Partial<Record<MarketScope, string>>
> = {
  ja: Object.fromEntries(
    MARKET_SCOPE_FALLBACK_DEFINITIONS.map((definition) => [
      definition.scope,
      definition.displayName,
    ]),
  ) as Partial<Record<MarketScope, string>>,
  en: {
    national: 'National average',
    'city:tokyo': 'Tokyo Metropolitan Wholesale Market',
    'city:osaka': 'Osaka Municipal Wholesale Market',
    'city:nagoya': 'Nagoya Municipal Wholesale Market',
  },
}

interface ShareTemplateContext {
  readonly regionLabel: string
  readonly marketLabel: string
  readonly categoryLabel: string
  readonly week: string
}

const SHARE_TEXT_TEMPLATE: Record<
  ShareLanguage,
  (context: ShareTemplateContext) => string
> = {
  ja: ({ regionLabel, marketLabel, categoryLabel, week }) =>
    `地域: ${regionLabel} / 市場: ${marketLabel} / カテゴリ: ${categoryLabel} / 週: ${week}`,
  en: ({ regionLabel, marketLabel, categoryLabel, week }) =>
    `Region: ${regionLabel} / Market: ${marketLabel} / Category: ${categoryLabel} / Week: ${week}`,
}

const selectLocalizedValue = <Key extends string>(
  dictionary: Record<ShareLanguage, Partial<Record<Key, string>>>,
  key: Key,
  language: ShareLanguage,
): string | null => {
  for (const candidate of buildLanguageFallbackOrder(language)) {
    const localized = dictionary[candidate]?.[key]
    if (localized) {
      return localized
    }
  }
  return null
}

const resolveRegionLabel = (region: Region, language: ShareLanguage): string =>
  selectLocalizedValue(REGION_LABEL_DICTIONARY, region, language) ?? region

const resolveCategoryLabel = (category: CropCategory, language: ShareLanguage): string =>
  selectLocalizedValue(CATEGORY_LABEL_DICTIONARY, category, language) ?? category

const resolveMarketLabel = (scope: MarketScope, language: ShareLanguage): string =>
  selectLocalizedValue(MARKET_LABEL_FALLBACK_DICTIONARY, scope, language) ?? scope

const resolveShareText = (context: ShareContext, language: ShareLanguage): string => {
  const template = SHARE_TEXT_TEMPLATE[language]
  return template({
    regionLabel: resolveRegionLabel(context.region, language),
    marketLabel: resolveMarketLabel(context.marketScope, language),
    categoryLabel: resolveCategoryLabel(context.category, language),
    week: context.week,
  })
}

const buildShareUrl = ({
  region,
  marketScope,
  category,
  week,
}: ShareContext): string => {
  const url = new URL(window.location.href)
  const params = url.searchParams
  params.set('region', region)
  params.set('marketScope', marketScope)
  params.set('category', category)
  params.set('week', week)
  url.search = params.toString()
  return url.toString()
}

const copyToClipboard = async (text: string): Promise<ShareResult> => {
  const clipboard = navigator.clipboard
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    return 'error'
  }
  try {
    await clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'error'
  }
}

export const isShareSupported = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function'

interface ShareContext {
  readonly region: Region
  readonly marketScope: MarketScope
  readonly category: CropCategory
  readonly week: string
}

export const shareCurrentView = async (
  context: ShareContext,
): Promise<ShareResult> => {
  const language = resolveShareLanguage()
  const shareUrl = buildShareUrl(context)
  const shareData: ShareData = {
    title: APP_TEXT.title,
    text: resolveShareText(context, language),
    url: shareUrl,
  }

  if (isShareSupported()) {
    try {
      await navigator.share(shareData)
      return 'success'
    } catch {
      // fall through to clipboard
    }
  }

  return copyToClipboard(shareUrl)
}
