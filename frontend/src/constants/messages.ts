import type { CropCategory, Region } from '../types'

const DEFAULT_LANGUAGE = 'ja' as const

const APP_TEXT_DICTIONARY = {
  ja: {
    title: 'Planting Planner',
  },
  en: {
    title: 'Planting Planner',
  },
} as const

const SEARCH_CONTROLS_TEXT_DICTIONARY = {
  ja: {
    searchPlaceholder: '作物名・カテゴリで検索',
    searchAriaLabel: '作物検索',
    marketLabel: '市場',
    marketAriaLabel: '市場',
    weekLabel: '週',
    submitButton: 'この条件で見る',
    refreshButton: '更新',
    refreshingButton: '更新中...',
    shareButton: '共有',
  },
  en: {
    searchPlaceholder: 'Search by crop name or category',
    searchAriaLabel: 'Crop search',
    marketLabel: 'Market',
    marketAriaLabel: 'Market',
    weekLabel: 'Week',
    submitButton: 'View with these filters',
    refreshButton: 'Refresh',
    refreshingButton: 'Refreshing...',
    shareButton: 'Share',
  },
} as const

const TOAST_MESSAGES_DICTIONARY = {
  ja: {
    refreshSuccessMessage: 'データ更新が完了しました',
    refreshSuccessDetail: (updatedRecords: number) =>
      `${updatedRecords}件のデータを更新しました。`,
    refreshFailureMessage: 'データ更新に失敗しました',
    refreshUnknown: '更新ステータスが不明です。',
    refreshStatusUnknownDetail: '詳細不明のエラー',
    refreshStatusFetchFailureMessage: '更新状況の取得に失敗しました',
    refreshStatusTimeout: '更新状況の取得がタイムアウトしました',
    refreshStatusTimeoutDetail: null,
    refreshRequestFailure: '更新リクエストに失敗しました。',
    refreshRequestStarted: '更新を開始しました。進行状況を確認しています…',
    refreshRequestFailureWithDetail: (detail: string) =>
      `更新リクエストに失敗しました: ${detail}`,
    recommendationFallbackWarning:
      '市場データが一時的に利用できないため、推定値を表示しています。',
    recommendationUnavailable: '推奨データを取得できませんでした（取得不可）',
    serviceWorkerUpdateAvailable: '新しいバージョンが利用可能です。',
    serviceWorkerUpdateDetail: '最新の変更を反映するには更新してください。',
    serviceWorkerUpdateNow: '今すぐ更新',
    serviceWorkerUpdateLater: 'あとで',
    shareSuccess: '共有リンクを送信しました',
    shareCopied: '共有リンクをコピーしました',
    shareError: '共有に失敗しました',
  },
  en: {
    refreshSuccessMessage: 'Data refresh completed',
    refreshSuccessDetail: (updatedRecords: number) =>
      `${updatedRecords} records have been updated.`,
    refreshFailureMessage: 'Failed to refresh data',
    refreshUnknown: 'Refresh status is unknown.',
    refreshStatusUnknownDetail: 'Unknown error details',
    refreshStatusFetchFailureMessage: 'Failed to fetch refresh status',
    refreshStatusTimeout: 'Timed out while fetching refresh status',
    refreshStatusTimeoutDetail: null,
    refreshRequestFailure: 'Failed to request refresh.',
    refreshRequestStarted: 'Refresh started. Checking progress…',
    refreshRequestFailureWithDetail: (detail: string) =>
      `Failed to request refresh: ${detail}`,
    recommendationFallbackWarning:
      'Market data is temporarily unavailable; showing estimated values.',
    recommendationUnavailable: 'Could not fetch recommendation data (unavailable)',
    serviceWorkerUpdateAvailable: 'A new version is available.',
    serviceWorkerUpdateDetail: 'Please refresh to apply the latest changes.',
    serviceWorkerUpdateNow: 'Update now',
    serviceWorkerUpdateLater: 'Later',
    shareSuccess: 'Shared link has been sent',
    shareCopied: 'Shared link copied',
    shareError: 'Failed to share',
  },
} as const

type PriceChartMessages = {
  readonly section: {
    readonly heading: string
    readonly hint: string
    readonly loading: string
  }
  readonly chart: {
    readonly status: {
      readonly idle: string
      readonly loading: string
      readonly empty: string
    }
    readonly legendLabel: string
    readonly ariaLabel: (title: string) => string
    readonly periodRange: (from: string, to: string) => string
    readonly summary: (title: string, period: string, count: number) => string
  }
}

const PRICE_CHART_MESSAGES_DICTIONARY: Record<LanguageCode, PriceChartMessages> = {
  ja: {
    section: {
      heading: '価格推移',
      hint: '作物一覧で行をクリックすると、価格推移が表示されます。',
      loading: '価格チャートを準備中です…',
    },
    chart: {
      status: {
        idle: '作物を選択すると価格推移が表示されます。',
        loading: '価格データを読み込み中です…',
        empty: '価格データがありません。',
      },
      legendLabel: '週平均価格',
      ariaLabel: (title) => `${title} の価格推移`,
      periodRange: (from, to) => `${from} 〜 ${to}`,
      summary: (title, period, count) =>
        `${title} の週平均価格。期間: ${period}。データ点数: ${count}件。`,
    },
  },
  en: {
    section: {
      heading: 'Price trend',
      hint: 'Click a row in the crop list to view price trends.',
      loading: 'Preparing price chart…',
    },
    chart: {
      status: {
        idle: 'Select a crop to view price trends.',
        loading: 'Loading price data…',
        empty: 'No price data available.',
      },
      legendLabel: 'Weekly average price',
      ariaLabel: (title) => `Price trend for ${title}`,
      periodRange: (from, to) => `${from} to ${to}`,
      summary: (title, period, count) =>
        `Weekly average price for ${title}. Period: ${period}. Data points: ${count}.`,
    },
  },
} as const

type RecommendationTableMessages = {
  readonly regionNames: Record<Region, string>
  readonly categoryLabels: Record<CropCategory, string>
  readonly labels: {
    readonly region: string
    readonly baselineWeek: string
    readonly category: string
    readonly sowingWeek: string
    readonly harvestWeek: string
    readonly source: string
  }
  readonly tableHeaders: {
    readonly crop: string
    readonly period: string
    readonly source: string
  }
  readonly status: {
    readonly loading: string
    readonly emptyTitle: string
    readonly emptyDescription: string
  }
  readonly listLabel: (regionLabel: string, displayWeek: string) => string
}

const RECOMMENDATIONS_TABLE_MESSAGES_DICTIONARY: Record<
  LanguageCode,
  RecommendationTableMessages
> = {
  ja: {
    regionNames: {
      cold: '寒冷地',
      temperate: '温暖地',
      warm: '暖地',
    },
    categoryLabels: {
      leaf: '葉菜類',
      root: '根菜類',
      flower: '花き',
    },
    labels: {
      region: '対象地域',
      baselineWeek: '基準週',
      category: 'カテゴリ',
      sowingWeek: '播種週',
      harvestWeek: '収穫週',
      source: '情報源',
    },
    tableHeaders: {
      crop: '作物',
      period: '期間',
      source: '情報源',
    },
    status: {
      loading: '読み込み中',
      emptyTitle: '推奨データがありません',
      emptyDescription: '市場やカテゴリを変更して再度お試しください。',
    },
    listLabel: (regionLabel, displayWeek) =>
      `${regionLabel}向けの推奨一覧（基準週: ${displayWeek}）`,
  },
  en: {
    regionNames: {
      cold: 'Cold region',
      temperate: 'Temperate region',
      warm: 'Warm region',
    },
    categoryLabels: {
      leaf: 'Leafy vegetables',
      root: 'Root vegetables',
      flower: 'Flower crops',
    },
    labels: {
      region: 'Region',
      baselineWeek: 'Baseline week',
      category: 'Category',
      sowingWeek: 'Sowing week',
      harvestWeek: 'Harvest week',
      source: 'Source',
    },
    tableHeaders: {
      crop: 'Crop',
      period: 'Period',
      source: 'Source',
    },
    status: {
      loading: 'Loading',
      emptyTitle: 'No recommendations available',
      emptyDescription: 'Try adjusting the market or category filters.',
    },
    listLabel: (regionLabel, displayWeek) =>
      `Recommendations for ${regionLabel} (Baseline week: ${displayWeek})`,
  },
} as const

const APP_STATUS_MESSAGES_DICTIONARY = {
  ja: {
    offlineBannerTitle: 'オフラインで表示しています',
    offlineBannerDetail: '最新データはオンライン復帰後に自動で同期されます。',
    offlineBannerLastSync: (value: string) => `最終同期: ${value}`,
    offlineBannerLastSyncUnknown: '最終同期: 未同期',
    statusOnline: 'オンライン',
    statusOffline: 'オフライン',
    statusLastSyncPrefix: '最終同期: ',
    statusLastSyncUnknown: '未同期',
    versionLabel: (version: string) => `バージョン: ${version}`,
  },
  en: {
    offlineBannerTitle: 'You are viewing offline',
    offlineBannerDetail:
      'Latest data will sync automatically once you are back online.',
    offlineBannerLastSync: (value: string) => `Last sync: ${value}`,
    offlineBannerLastSyncUnknown: 'Last sync: not synced',
    statusOnline: 'Online',
    statusOffline: 'Offline',
    statusLastSyncPrefix: 'Last sync: ',
    statusLastSyncUnknown: 'Not synced',
    versionLabel: (version: string) => `Version: ${version}`,
  },
} as const

type LanguageCode = keyof typeof APP_TEXT_DICTIONARY

export type FeatureFlagConfig = {
  readonly I18N_EN?: boolean
}

declare global {
  // eslint-disable-next-line no-var
  var FEATURE_FLAGS: FeatureFlagConfig | undefined
}

const getRuntimeFeatureFlags = (): FeatureFlagConfig => {
  const flags = (globalThis as { FEATURE_FLAGS?: FeatureFlagConfig }).FEATURE_FLAGS

  if (!flags || typeof flags !== 'object') {
    return {}
  }

  return flags
}

const isEnglishEnabled = (): boolean => {
  const runtimeFlag = getRuntimeFeatureFlags().I18N_EN

  if (typeof runtimeFlag === 'boolean') {
    return runtimeFlag
  }

  const envFlag = import.meta.env?.VITE_I18N_EN

  if (typeof envFlag === 'string') {
    return envFlag.toLowerCase() === 'true'
  }

  return false
}

const getRequestedLanguage = (): LanguageCode | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const { searchParams } = new URL(window.location.href)
    const langParam = searchParams.get('lang')?.toLowerCase()

    if (langParam === 'en') {
      return 'en'
    }
  } catch {
    // ignore malformed URLs and fall back to default language
  }

  return null
}

const resolveLanguage = (): LanguageCode => {
  const requestedLanguage = getRequestedLanguage()
  const language: LanguageCode =
    requestedLanguage === 'en' && isEnglishEnabled() ? 'en' : DEFAULT_LANGUAGE

  if (typeof document !== 'undefined' && document?.documentElement) {
    document.documentElement.lang = language
  }

  return language
}

const selectMessages = <Dictionary extends Record<LanguageCode, unknown>>(
  dictionary: Dictionary,
): Dictionary[LanguageCode] => {
  const language = resolveLanguage()
  const fallback = dictionary[DEFAULT_LANGUAGE]
  const selected = dictionary[language]

  return (selected ?? fallback) as Dictionary[LanguageCode]
}

const WEATHER_MESSAGES_DICTIONARY = {
  ja: {
    title: '天気',
    latestLabel: '最新値',
    previousLabel: '前回値',
    updatedAt: (value: string) => `取得日時: ${value}`,
    loading: '取得中…',
    empty: '天気データがありません',
    error: '天気データの取得に失敗しました',
    metrics: {
      tmax: '最高気温',
      tmin: '最低気温',
      rain: '降水量',
      wind: '風速',
    },
  },
  en: {
    title: 'Weather',
    latestLabel: 'Latest value',
    previousLabel: 'Previous value',
    updatedAt: (value: string) => `Updated at: ${value}`,
    loading: 'Loading…',
    empty: 'No weather data',
    error: 'Failed to fetch weather data',
    metrics: {
      tmax: 'High temperature',
      tmin: 'Low temperature',
      rain: 'Precipitation',
      wind: 'Wind speed',
    },
  },
} as const

export const WEATHER_MESSAGES = selectMessages(WEATHER_MESSAGES_DICTIONARY)
export const APP_TEXT = selectMessages(APP_TEXT_DICTIONARY)
export const SEARCH_CONTROLS_TEXT = selectMessages(SEARCH_CONTROLS_TEXT_DICTIONARY)
export const TOAST_MESSAGES = selectMessages(TOAST_MESSAGES_DICTIONARY)
export const PRICE_CHART_MESSAGES = selectMessages(PRICE_CHART_MESSAGES_DICTIONARY)
export const RECOMMENDATIONS_TABLE_MESSAGES = selectMessages(
  RECOMMENDATIONS_TABLE_MESSAGES_DICTIONARY,
)
export const APP_STATUS_MESSAGES = selectMessages(APP_STATUS_MESSAGES_DICTIONARY)
