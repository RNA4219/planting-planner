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
} as const
