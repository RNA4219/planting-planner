# アーキテクチャ概要 — v0.3

- バックエンド: FastAPI は既存 `/api/recommend` で `marketScope` クエリを受ける。
  `market_prices` から都市別レコードを参照し、レスポンス形は維持する。
- フロントエンド: React + Vite + Tailwind へ移行し、store に `selectedMarket` と
  `selectedCategory` を追加する。
  副作用は actions へ集約する。
- データ同期: React Query のキーへ市場とカテゴリを含める。
  都市欠損時は全国平均へフォールバックするハンドラを共通ユーティリティ化する。
- テーマ: `frontend/tailwind.config.ts` で `theme.colors.market.*` を含むテーマトーク
  ンを読み込み、Tailwind ユーティリティによるスタイリングへ移行済み。
- 品質: Playwright E2E はリクエストフックでモックを連携する。
  CI は `frontend` `frontend e2e (playwright)` `backend-lint` `backend-test`
  `frontend-lighthouse` の複数ジョブで検証を分担する。
  メトリクス CLI は PRD 同様に `--job-name` 指定が必須で、ジョブ表示名と CLI 引数
  要件を反映済み。
