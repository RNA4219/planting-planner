import { APP_TEXT } from '../constants/messages'
import { MARKET_SCOPE_FALLBACK_DEFINITIONS } from '../constants/marketScopes'
import type { CropCategory, MarketScope, Region } from '../types'

export type ShareResult = 'success' | 'copied' | 'error'

const REGION_LABEL: Record<Region, string> = {
  cold: '寒冷地',
  temperate: '温暖地',
  warm: '暖地',
}

const CATEGORY_LABEL: Record<CropCategory, string> = {
  leaf: '葉菜類',
  root: '根菜類',
  flower: '花き類',
}

const MARKET_LABEL = new Map<MarketScope, string>(
  MARKET_SCOPE_FALLBACK_DEFINITIONS.map((definition) => [
    definition.scope,
    definition.displayName,
  ]),
)

const resolveMarketLabel = (scope: MarketScope): string =>
  MARKET_LABEL.get(scope) ?? scope

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
  const shareUrl = buildShareUrl(context)
  const shareData: ShareData = {
    title: APP_TEXT.title,
    text: `地域: ${REGION_LABEL[context.region]} / 市場: ${resolveMarketLabel(context.marketScope)} / カテゴリ: ${CATEGORY_LABEL[context.category]} / 週: ${context.week}`,
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
