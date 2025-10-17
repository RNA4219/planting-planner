# Runbook

## 1) 先読み破損
- 症状: オフライン時に一覧が空
- 対処: ブラウザ DevTools → Application → IndexedDB → `prefetch` を選択し「Delete database」で削除 → 再読み込み → オンラインで 1 回アクセス（DB 名は `frontend/src/lib/prefetchStore.ts` の `DB_NAME` に一致）。[^prefetch-reset]
- 監視: 先読みヒット率 < 20% でアラート

[^prefetch-reset]: `clearPrefetchSnapshots` は `frontend/src/lib/prefetchStore.ts` に実装されており、IndexedDB `prefetch` を初期化するユーティリティ。DevTools Console で `await import('/src/lib/prefetchStore.ts').then((m) => m.clearPrefetchSnapshots())` を実行しても同様にリセットできる。

## 2) DB マイグ失敗
- 症状: `/api/health` のレスポンスに `migrations.pending > 0`
- 対処: `poetry run python -c "from backend.app.db.migrations import init_db; init_db()"` を実行してスキーマを再作成し、必要なら後続のシードを待機（`prepare_database` を経由する通常起動でも同処理が自動実行される）。実行後に `/api/health` で `migrations.pending == 0` を確認。
- 監視: `migrations.pending` が 5 分継続でアラート

## 3) PWA 更新停滞
- 症状: 新版に上がらない
- 対処: `SW_FORCE_UPDATE` を一時 ON。次回セッションで更新トースト必須化
- 監視: `SW_WAITING` の滞留が 1 時間超でアラート

## 4) BG Sync 失敗
- 症状: `POST /api/refresh` が再送されずリフレッシュが反映されない
- 対処: IndexedDB の `sync-queue` で対象エントリを確認し、`lastFailureAt` と `lastFailureMessage` を Runbook 記録に転記。原因が解消されたら `bg.sync.retry` ログを監視しながら再送を待つ。
- 監視: `bg.sync.retry` の失敗が 3 回連続で計測されたらアラート
