# アーキテクチャ概要 — v0.3

- バックエンド: FastAPI は既存 `/api/recommend` で `marketScope` クエリを受け、`market_prices` から都市別レコードを参照しつつレスポンス形は維持。
- フロントエンド: React + Vite + Tailwind へ移行し、store に `selectedMarket` と `selectedCategory` を追加、副作用は actions に集約。
- データ同期: React Query のキーへ市場とカテゴリを含め、都市欠損時は全国平均へフォールバックするハンドラを共通ユーティリティ化。
- テーマ: `frontend/tailwind.config.ts` で `theme.colors.market.*` を定義し、旧 CSS Modules は互換レイヤーとして読み込み順を制御。
- 品質: Playwright E2E と API モックを `frontend/tests/e2e` で共通化し、CI は単一ジョブでバックエンドスタブを起動して連携検証。
