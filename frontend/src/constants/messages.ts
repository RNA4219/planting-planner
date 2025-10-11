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
  refreshSuccess: (updatedRecords: number) =>
    `更新が完了しました。${updatedRecords}件のデータを更新しました。`,
  refreshFailure: (detail: string) => `更新が失敗しました: ${detail}`,
  refreshUnknown: '更新ステータスが不明です。',
  refreshStatusUnknownDetail: '詳細不明のエラー',
  refreshStatusFetchFailure: (detail: string) =>
    `更新ステータスの取得に失敗しました: ${detail}`,
  refreshRequestFailure: '更新リクエストに失敗しました。',
  refreshRequestStarted: '更新を開始しました。進行状況を確認しています…',
  refreshRequestFailureWithDetail: (detail: string) =>
    `更新リクエストに失敗しました: ${detail}`,
} as const
