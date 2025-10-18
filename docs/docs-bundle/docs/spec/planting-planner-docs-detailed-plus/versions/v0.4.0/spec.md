# v0.4.0 Compose + DB – 仕様

## ENV

- `DB_URL`: `sqlite:///data/app.db` / `postgresql://user:pass@db:5432/app` /
  `postgresql://supabase`
- `APP_ENV`: dev|stg|prod

## サービス

- frontend: 静的配信（Nginx 等）
- api: FastAPI/Node, `/healthz` 実装、`DB_URL` 注入
- db: Postgres（dev/stg）
- migrate: 起動時に `migrate up` 実行

## マイグレーション

- `db:migrate` / `db:rollback` / `db:seed`
- すべてチェックサム・依存ID付き
