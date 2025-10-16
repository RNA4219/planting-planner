export const APP_TEXT = {
  title: 'Planting Planner',
} as const

export const SEARCH_CONTROLS_TEXT = {
  searchPlaceholder: '作物名・カテゴリで検索',
  searchAriaLabel: '作物検索',
  weekLabel: '週',
  submitButton: 'この条件で見る',
  refreshButton: '更新',
  refreshingButton: '更新中...',
  shareButton: '共有',
} as const

export const TOAST_MESSAGES = {
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
  recommendationFallbackWarning: '市場データが一時的に利用できないため、推定値を表示しています。',
  recommendationUnavailable: '推奨データを取得できませんでした（取得不可）',
  serviceWorkerUpdateAvailable: '新しいバージョンが利用可能です。',
  serviceWorkerUpdateDetail: '最新の変更を反映するには更新してください。',
  serviceWorkerUpdateNow: '今すぐ更新',
  serviceWorkerUpdateLater: 'あとで',
  shareSuccess: '共有リンクを送信しました',
  shareCopied: '共有リンクをコピーしました',
  shareError: '共有に失敗しました',
} as const

export const APP_STATUS_MESSAGES = {
  offlineBannerTitle: 'オフラインで表示しています',
  offlineBannerDetail: '最新データはオンライン復帰後に自動で同期されます。',
  offlineBannerLastSync: (value: string) => `最終同期: ${value}`,
  offlineBannerLastSyncUnknown: '最終同期: 未同期',
  statusOnline: 'オンライン',
  statusOffline: 'オフライン',
  statusLastSyncPrefix: '最終同期: ',
  statusLastSyncUnknown: '未同期',
  versionLabel: (version: string) => `バージョン: ${version}`,
} as const

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
