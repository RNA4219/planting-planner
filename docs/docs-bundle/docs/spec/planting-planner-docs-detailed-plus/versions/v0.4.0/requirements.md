# v0.4.0 Compose + DB スイッチ – 要件

## ゴール

- `docker compose up -d` の**1コマンド起動**
- ENV だけで SQLite/PG/Supabase を切替。アプリは無改造

## スコープ（In）

- `docker-compose.yml`（frontend, api, db, migrate）
- マイグレーション基盤、`DB_URL` 切替

## 非機能要件

- 起動 60s 以内、`/healthz` = 200
- マイグレーションは idempotent / 逆順可能

## 受入基準

- [ ] **AC-040-001** .env.example → 1 コマンド起動
- [ ] **AC-040-002** SQLite ↔ PostgreSQL で機能差ゼロ
- [ ] **AC-040-003** up/down/seed が再実行でも破綻しない
- [ ] **AC-040-004** `up→up→status` / `down→down` が安全（差分 0 またはノーオペ）
