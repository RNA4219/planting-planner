import { APP_TEXT, TOAST_MESSAGES } from '../constants/messages'
import { MARKET_SCOPE_FALLBACK_DEFINITIONS } from '../constants/marketScopes'
import type { CropCategory, MarketScope, Region } from '../types'

const REGION_LABELS: Record<Region, string> = {
  cold: '寒冷地',
  temperate: '温暖地',
  warm: '暖地',
}

const CATEGORY_LABELS: Record<CropCategory, string> = {
  leaf: '葉菜',
  root: '根菜',
  flower: '花き',
}

const MARKET_LABELS = new Map<MarketScope, string>(
  MARKET_SCOPE_FALLBACK_DEFINITIONS.map((definition) => [definition.scope, definition.displayName]),
)

const resolveMarketLabel = (marketScope: MarketScope): string => {
  return MARKET_LABELS.get(marketScope) ?? marketScope
}

const createShareText = ({
  region,
  marketScope,
  category,
  week,
}: ShareCurrentViewArgs): string => {
  const regionLabel = REGION_LABELS[region] ?? region
  const marketLabel = resolveMarketLabel(marketScope)
  const categoryLabel = CATEGORY_LABELS[category] ?? category
  return `地域: ${regionLabel} / 市場: ${marketLabel} / カテゴリ: ${categoryLabel} / 週: ${week}`
}

const createShareUrl = ({ region, marketScope, category, week }: ShareCurrentViewArgs): string => {
  const { location } = window
  const url = new URL(location.href)
  url.searchParams.set('region', region)
  url.searchParams.set('marketScope', marketScope)
  url.searchParams.set('category', category)
  url.searchParams.set('week', week)
  return url.toString()
}

export type ShareResult = 'success' | 'copied' | 'error'

export interface ShareCurrentViewArgs {
  readonly region: Region
  readonly marketScope: MarketScope
  readonly category: CropCategory
  readonly week: string
}

export const isShareSupported = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false
  }
  return typeof navigator.share === 'function'
}

const shareWithClipboard = async (shareUrl: string): Promise<ShareResult> => {
  if (typeof navigator === 'undefined') {
    return 'error'
  }
  const { clipboard } = navigator
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    return 'error'
  }
  try {
    await clipboard.writeText(shareUrl)
    return 'copied'
  } catch {
    return 'error'
  }
}

export const shareCurrentView = async (
  args: ShareCurrentViewArgs,
): Promise<ShareResult> => {
  const shareText = createShareText(args)
  const shareUrl = createShareUrl(args)
  const shareData: ShareData = {
    title: APP_TEXT.title,
    text: shareText,
    url: shareUrl,
  }

  if (isShareSupported()) {
    try {
      await navigator.share(shareData)
      return 'success'
    } catch {
      // フォールバックに進む
    }
  }

  return shareWithClipboard(shareUrl)
}

export const SHARE_TOAST_MESSAGE_MAP: Record<ShareResult, string> = {
  success: TOAST_MESSAGES.shareSuccess,
  copied: TOAST_MESSAGES.shareCopied,
  error: TOAST_MESSAGES.shareError,
}
