# Runbook

## 1) 先読み破損
- 症状: オフライン時に一覧が空
- 対処: ブラウザ DevTools → Application → IndexedDB → `prefetch` を選択し「Delete database」で削除 → 再読み込み → オンラインで 1 回アクセス（DB 名は `frontend/src/lib/prefetchStore.ts` の `DB_NAME` に一致）。[^prefetch-reset]
- 監視: 先読みヒット率 < 20% でアラート

[^prefetch-reset]: `clearPrefetchSnapshots` は `frontend/src/lib/prefetchStore.ts` に実装されており、IndexedDB `prefetch` を初期化するユーティリティ。DevTools Console で `await import('/src/lib/prefetchStore.ts').then((m) => m.clearPrefetchSnapshots())` を実行しても同様にリセットできる。

## 2) DB マイグ失敗
- 症状: `/healthz` に `migrations.pending > 0`
- 対処: `db:rollback` → 修正 → `db:migrate` → `status` で 0 を確認
- 監視: `migrations.pending` が 5 分継続でアラート

## 3) PWA 更新停滞
- 症状: 新版に上がらない
- 対処: `SW_FORCE_UPDATE` を一時 ON。次回セッションで更新トースト必須化
- 監視: `SW_WAITING` の滞留が 1 時間超でアラート
