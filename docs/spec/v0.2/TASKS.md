# v0.2 タスクメモ

> スコープ: 各タスクは 1 ファイルあたり 1 回のみ指定。テスト追加→実装修正の順。

## frontend/src/hooks/__tests__/useRefreshStatus.controller.test.ts
- [x] 5 秒後の自動クローズと `dismissToast` 手動クローズをフェイクタイマーで検証するケースを追加。
- [x] `stale` レスポンスとフェッチエラー時のトースト種別・重複抑止を検証するケースを追加。

## frontend/src/hooks/refresh/controller.ts
- [x] テスト追加後、トーストごとにタイマーを保持して自動クローズし、`dismissToast` がタイマーを片付けるよう実装を更新。
- [x] リフレッシュ成功時にコールバックで `reloadCurrentWeek` を起動できるようオプションを追加し、既存シグネチャ互換を維持。

## frontend/src/hooks/refresh/poller.test.ts
- [x] `createRefreshStatusPoller` が停止時にスケジュール済みタイマーを解除し、`stale` 到達で `onTerminal` を一度だけ呼ぶことを確認するユニットテストを作成。

## frontend/src/hooks/refresh/poller.ts
- [x] テスト追加後、`schedule`/`cancel` 差し替え時にタイマー参照を必ず解放し、例外時も `onError` 実行後に停止するようリファクタリング。

## frontend/src/components/__tests__/ToastStack.test.tsx
- [x] `ToastStack` 仮コンポーネントのスナップショットを避け、ロール `alert` と閉じるボタンの挙動・自動クローズ発火を検証するテストを追加。

## frontend/src/components/ToastStack.tsx
- [x] テスト追加後、ARIA 属性と閉じるボタンを備えたトーストスタックを実装し、5 秒タイマーと `onDismiss` ハンドラを受け付けるようにする。

## frontend/tests/app.refresh.test.tsx
- [x] フェイクタイマーで `/refresh` 成功→`/refresh/status` ポーリング→成功トースト表示→`reloadCurrentWeek` 呼び出しを検証する統合テストを追加。自動クローズ確認は `ToastStack` の単体テストへ委譲。

## frontend/tests/utils/renderApp.tsx
- [x] テスト追加後、`renderApp` にトースト待機ユーティリティを追加し、`useFakeTimers` オプション利用時に `vi.useFakeTimers()` を委譲してリセットするよう更新。

## frontend/tests/recommendations/favoritesPrioritization.test.tsx
- [x] 新トースト制御の導入後もお気に入り優先ロジックが壊れないよう、不要な手動 `setInterval` を除去して `fetchRefreshStatus` ポーリング挙動を検証するテストに書き換え。

## frontend/src/App.tsx
- [x] テスト追加後、ローカル実装の `useRefreshStatus` を削除し `hooks/useRefreshStatus` と `ToastStack` を利用、成功時に `reloadCurrentWeek` を呼ぶように実装更新。

## frontend/package.json
- [x] Vitest の単一ファイル実行をサポートする `"test:file"` スクリプトを追加し、CI 用 `test` スクリプトは `vitest run` に統一する。

## docs/spec/v0.2/TESTING.md
- [x] `npm test` の利用手順を更新し、`npm run test:file -- <pattern>` の例と Vitest CLI オプション対応状況を追記。
  - `SearchControls`（旧 `SearchBox`）、`RecommendationsTable`（旧 `CropList`）、`useRefreshStatusController`／`createRefreshStatusPoller`（旧 `RefreshStatusPoller`）の名称同期を明示し、対応するテストスイートの参照先を一覧化。

## frontend/src/hooks/useRefreshStatus.test.ts
- [x] `__tests__/useRefreshStatus.controller.test.ts` に重複したケースを移管した後、当ファイルのレガシーテストを削除。

## frontend/src/hooks/useRecommendations.test.ts
- [ ] ファイルを `hooks/__tests__/useRecommendations.controller.test.ts` などに分割し、共通モックを `tests/utils/recommendations` へ抽出して 200 行未満にするリファクタリングを実施。
