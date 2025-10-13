# データスキーマ — v0.3

- `market_prices` は `scope`（`national` or `city:<id>`）列を既存のまま使用し、UI へ渡す市場リストは `market_metadata` ビューで提供。
- カテゴリタブは `market_scope_categories` に保存されたカテゴリ設定を優先し、欠損時は ETL の `_resolve_categories` が `market_prices` と `crops` からスコープ単位でカテゴリを動的生成する。
- ETL は `market_metadata` 更新時に `effective_from` を更新し、API は最新レコードのみをキャッシュ経由で返却。
- Tailwind 用カラートークンは `theme_tokens` テーブルを `data/theme_tokens.json` から seed し、ETL は `metadata_cache` を更新することで同スナップショットを Tailwind (`frontend/tailwind.config.ts`) と共有する静的資産 (`theme_tokens.json`) としてバンドル。
