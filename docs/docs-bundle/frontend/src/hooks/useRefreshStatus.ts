// レガシー互換用シム。
// 移行チェックリスト:
// - [ ] 呼び出し元を `hooks/refresh/controller` のエントリに切り替える
// - [ ] シム削除後に不要な依存とテストを整理する

export { useRefreshStatus } from './refresh/controller'
export type {
  RefreshToast,
  RefreshToastVariant,
  UseRefreshStatusOptions,
  UseRefreshStatusResult,
} from './refresh/controller'
