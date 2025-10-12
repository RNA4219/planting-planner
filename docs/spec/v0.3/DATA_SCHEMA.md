# データスキーマ — v0.3

- `market_prices` は `scope`（`national` or `city:<id>`）列を既存のまま使用し、UI へ渡す市場リストは `market_metadata` ビューで提供。
- カテゴリタブは `crops.category`（enum: leaf, root, flower）を利用し、欠損は `unknown` から最寄カテゴリへマッピングするフォールバック表を追加。
- ETL は `market_metadata` 更新時に `effective_from` を更新し、API は最新レコードのみをキャッシュ経由で返却。
- Tailwind 用カラートークンは `theme_tokens` テーブルで参照し、ETL 後に JSON 設定を再生成してフロントへバンドル。
