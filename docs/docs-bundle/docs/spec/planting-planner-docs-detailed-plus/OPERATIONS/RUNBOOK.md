# Runbook

## 1) 先読み破損
- 症状: オフライン時に一覧が空
- 対処: ブラウザ DevTools → Application → IndexedDB → `prefetch` を選択し「Delete database」で削除 → 再読み込み → オンラインで 1 回アクセス（DB 名は `frontend/src/lib/prefetchStore.ts` の `DB_NAME` に一致）。[^prefetch-reset]
- 監視: 先読みヒット率 < 20% でアラート

[^prefetch-reset]: `clearPrefetchSnapshots` は `frontend/src/lib/prefetchStore.ts` に実装されており、IndexedDB `prefetch` を初期化するユーティリティ。DevTools Console で `await import('/src/lib/prefetchStore.ts').then((m) => m.clearPrefetchSnapshots())` を実行しても同様にリセットできる。

## 2) DB マイグ失敗
- 症状: `/api/health` が 200 以外、またはレスポンス JSON が `{"status": "ok"}` にならない。
- 対処:
  1. `poetry run python -c "from backend.app.db.migrations import init_db; init_db()"` を実行してスキーマを再作成し、必要なら後続のシードを待機しつつ、実行時に例外が出ていないことを確認（`prepare_database` を経由する通常起動でも同処理が自動実行される）。
  2. `/api/health` にアクセスし、`{"status": "ok"}` が返ることを確認。
  3. 代替策: `/api/health` の応答が復旧しない場合は `/api/refresh/status` の `state` が `success` または `stale` であること、併せて `last_error` が空であることを確認し、いずれかで正常化を判断する。
- 監視: `/api/health` が 5 分以上 `{"status": "ok"}` を返せない場合にアラート

## 3) PWA 更新停滞
- 症状: 新版に上がらない
- 対処: `SW_FORCE_UPDATE` を一時的に ON にし、次回セッションで更新トーストの表示を強制する。
- 監視: `sw.waiting` の滞留が 1 時間超でアラート

## 4) BG Sync 失敗
- 症状: `POST /api/refresh` が再送されずリフレッシュが反映されない
- 対処: IndexedDB の `sync-queue` で対象エントリを確認し、`lastFailureAt` と `lastFailureMessage` を Runbook 記録に転記。原因が解消されたら `bg.sync.retry` ログ（attempt=1,2 のみ発火）を追い、再送を待つ。
- 監視: `bg.sync.failed` が観測されたらアラート（`frontend/src/sw.ts` の `MAX_BACKGROUND_SYNC_ATTEMPTS = 3` で最終試行が失敗すると発火）。
