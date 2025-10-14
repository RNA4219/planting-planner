# アーキテクチャ概要 — v0.3

- バックエンド: FastAPI は既存 `/api/recommend` で `marketScope` クエリを受け、`market_prices` から都市別レコードを参照しつつレスポンス形は維持。
- フロントエンド: React + Vite + Tailwind へ移行し、store に `selectedMarket` と `selectedCategory` を追加、副作用は actions に集約。
- データ同期: React Query のキーへ市場とカテゴリを含め、都市欠損時は全国平均へフォールバックするハンドラを共通ユーティリティ化。
- テーマ: `frontend/tailwind.config.ts` で `theme.colors.market.*` を含むテーマトークンを読み込み、Tailwind ユーティリティによるスタイリングへ移行済み。
- 品質: Playwright E2E はリクエストフックでモックを連携し、CI は `frontend` `frontend e2e (playwright)` `backend-lint` `backend-test` `frontend-lighthouse` の複数ジョブ構成で検証を分担（メトリクス CLI は PRD 同様に `--job-name` 指定が必須）。
