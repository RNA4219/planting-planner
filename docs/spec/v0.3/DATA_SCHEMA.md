# データスキーマ — v0.3

- `market_prices` は `scope`（`national` or `city:<id>`）列を既存のまま使用し、UI へ渡す市場リストは `market_metadata` ビューで提供。
- カテゴリタブは `crops.category`（enum: leaf, root, flower）を利用し、欠損は `unknown` から最寄カテゴリへマッピングするフォールバック表を追加。
- ETL は `market_metadata` 更新時に `effective_from` を更新し、API は最新レコードのみをキャッシュ経由で返却。
- Tailwind 用カラートークンは `theme_tokens` テーブルを `data/theme_tokens.json` から seed し、ETL は `metadata_cache` を更新することで同スナップショットを Tailwind (`frontend/tailwind.config.ts`) と共有する静的資産 (`theme_tokens.json`) としてバンドル。
