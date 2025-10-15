# v0.4.0 Compose + DB – 設計

## アーキ
- API → ORM → Repository → DB（切替は `DB_URL`）
- 接続プール・タイムアウトは環境変数化

## 監視/ヘルス
- `/healthz`: { db.status, migrations.pending, app.version }
- Compose Healthcheck:
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -fsS http://localhost:8000/healthz || exit 1"]
  interval: 10s
  timeout: 3s
  retries: 10
```

## テスト
- CI: Postgres サービス起動→API 集合テスト
- マイグ: 順送り/巻戻しテスト（差分 0）
