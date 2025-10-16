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
    weekLabel: '週',
    submitButton: 'この条件で見る',
    refreshButton: '更新',
    refreshingButton: '更新中...',
    shareButton: '共有',
  },
  en: {
    searchPlaceholder: 'Search by crop name or category',
    searchAriaLabel: 'Crop search',
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

type MessageDictionary = typeof APP_TEXT_DICTIONARY
type SupportedLanguage = keyof MessageDictionary

type FeatureFlags = {
  I18N_EN?: boolean
}

declare global {
  // eslint-disable-next-line no-var
  var FEATURE_FLAGS: FeatureFlags | undefined

  interface Window {
    FEATURE_FLAGS?: FeatureFlags
  }
}

const readFeatureFlags = (): FeatureFlags | undefined => {
  if (typeof globalThis === 'undefined') {
    return undefined
  }

  if (typeof globalThis.FEATURE_FLAGS !== 'undefined') {
    return globalThis.FEATURE_FLAGS
  }

  if (typeof window !== 'undefined' && typeof window.FEATURE_FLAGS !== 'undefined') {
    return window.FEATURE_FLAGS
  }

  return undefined
}

const isEnglishEnabled = (flags: FeatureFlags | undefined): boolean => {
  if (flags?.I18N_EN) {
    return true
  }

  return import.meta.env?.VITE_I18N_EN === 'true'
}

const resolveLanguage = (): SupportedLanguage => {
  const flags = readFeatureFlags()
  const englishEnabled = isEnglishEnabled(flags)

  if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    const languageParam = new URLSearchParams(window.location.search ?? '').get('lang')

    if (languageParam === 'ja') {
      return 'ja'
    }

    if (languageParam === 'en' && englishEnabled) {
      return 'en'
    }
  }

  if (englishEnabled && typeof document !== 'undefined') {
    const lang = document.documentElement.lang
    if (lang === 'en') {
      return 'en'
    }
  }

  return DEFAULT_LANGUAGE
}

const SELECTED_LANGUAGE = resolveLanguage()

if (typeof document !== 'undefined') {
  document.documentElement.lang = SELECTED_LANGUAGE
}

const selectMessages = <T extends Record<SupportedLanguage, unknown>>(
  dictionary: T,
) => dictionary[SELECTED_LANGUAGE] as T[SupportedLanguage]

export const APP_TEXT = selectMessages(APP_TEXT_DICTIONARY)
export const SEARCH_CONTROLS_TEXT = selectMessages(
  SEARCH_CONTROLS_TEXT_DICTIONARY,
)
export const TOAST_MESSAGES = selectMessages(TOAST_MESSAGES_DICTIONARY)
export const APP_STATUS_MESSAGES = selectMessages(
  APP_STATUS_MESSAGES_DICTIONARY,
)

export const WEATHER_MESSAGES = {
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
} as const
