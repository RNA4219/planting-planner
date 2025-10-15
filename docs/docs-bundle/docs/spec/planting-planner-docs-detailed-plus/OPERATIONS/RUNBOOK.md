# Runbook

## 1) 先読み破損
- 症状: オフライン時に一覧が空
- 対処: 設定→先読みリセット→再読み込み→オンラインで1回アクセス
- 監視: 先読みヒット率 < 20% でアラート

## 2) DB マイグ失敗
- 症状: `/healthz` に `migrations.pending > 0`
- 対処: `db:rollback` → 修正 → `db:migrate` → `status` で 0 を確認
- 監視: `migrations.pending` が 5 分継続でアラート

## 3) PWA 更新停滞
- 症状: 新版に上がらない
- 対処: `SW_FORCE_UPDATE` を一時 ON。次回セッションで更新トースト必須化
- 監視: `SW_WAITING` の滞留が 1 時間超でアラート
