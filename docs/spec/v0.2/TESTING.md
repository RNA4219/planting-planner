# テスト戦略 — v0.2

## バックエンド

- `/api/refresh/status` が `updated_records` `last_error` を常に返すことを確認。
- 花き作物を含む `/api/recommend` 結果の妥当性をユニットテストで検証。
- `/api/price` がカテゴリ問わず価格を返し、単位が欠落しないことを確認。
- 欠損値補完ロジック（直近 3 週平均）を単体テストで担保。

## フロントエンド

- `SearchControls`
  （`frontend/src/components/__tests__/SearchControls.test.tsx`）が名前・カテゴリの部分
  一致フィルタを実行し、大文字小文字を無視するテスト。
- `useRefreshStatusController` と `createRefreshStatusPoller` の組み合わせが状態遷移で
  ポーリングを停止し、トースト表示を制御するテスト。
- `RecommendationsTable`（`frontend/tests/recommendations/*.test.tsx`）が検索結果とお
  気に入りの優先順位を満たすことを確認。
- `frontend/tests/app.refresh.test.tsx` による `/refresh` フロー統合テストで、成功時
  の `reloadCurrentWeek` 呼び出しと自動クローズを検証。

### テストコマンド

- `npm run test` — CI と同一の `vitest --run` 実行。追加オプションは `npm run test --
  --coverage` のように末尾へ委譲できる。
- `npm run test:file` — 指定パターンのファイルのみ実行。
  例: `npm run test:file -- "<pattern>"`（例:
  `src/hooks/__tests__/useRefreshStatus.controller.test.ts`）。
  `--reporter=dot` や `--runInBand` など Vitest CLI オプションを併用可能。

## E2E

- シナリオ: 「更新ボタン押下 → ステータス polling → 成功トースト → リスト更新 →
  価格チャート再描画」。
- アクセシビリティチェック: トーストの `role="alert"` と検索ボックスの
  `aria-label` を検証。

## テストデータ

- data/fixtures/ に花きデータサンプルと欠損ケースを追加し共通利用。
