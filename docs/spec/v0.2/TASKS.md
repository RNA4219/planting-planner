# v0.2 タスクメモ

> スコープ: 各タスクは 1 ファイルあたり 1 回のみ指定。テスト追加→実装修正の順。

## frontend/src/hooks/useRefreshStatus.ts
- [ ] `frontend/src/hooks/useRefreshStatus.test.ts` を追加し、success/failure/stale/timeout と 5 秒後自動クローズ・手動 dismiss を先行実装。
- [ ] テストをパスする `useRefreshStatus` 本体を実装し、`pendingToasts` と `dismissToast` を公開。

## frontend/src/App.tsx
- [ ] `app.refresh` テストを拡張し、`useRefreshStatus` フックの `pendingToasts`/`dismissToast` を期待するケースを追加。
- [ ] トーストスタック描画を共通フック準拠に置換し、`reloadCurrentWeek` で推薦/価格を再読込。

## frontend/tests/recommendations/favoritesPrioritization.test.tsx
- [ ] フェイクタイマーを用いて `fetchRefreshStatus` のポーリング前提に期待値を更新。
- [ ] お気に入り優先ロジックが維持される回帰テストを整備。

## frontend/src/hooks/useRecommendations.ts
- [ ] `reloadCurrentWeek` API をテスト先行で追加し、最後の地域・週を再取得できるようにする。
- [ ] 既存公開シグネチャを維持したまま実装を更新。

## frontend/src/hooks/useRecommendationLoader.ts
- [ ] `normalizeWeekInput` を純粋関数として切り出しテスト化。
- [ ] リファクタ後もフックの戻り値が変わらないことを確認。

## frontend/src/hooks/useRecommendations.test.ts
- [ ] describe 単位でテストを分割し、200 行未満となるよう `__tests__` ディレクトリへ移動。
- [ ] 共通モックは `recommendationTestUtils.ts` へ抽出。
