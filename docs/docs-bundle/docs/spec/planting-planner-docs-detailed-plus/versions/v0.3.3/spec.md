# v0.3.3 現場補助 – 仕様

## URL

- `q`, `region`, `from`/`to`(YYYY-MM-DD), `view`(list|chart)

## 先読みデータ

- スキーマ: { key, payload, fetchedAt, ttlHours }
- キー: `prefetch:{api}:{region}:{week}`、TTL=336h

## 追い出しアルゴリズム

1. 週の古い順に並べ替え
2. `quota - usage < 10MB` の間、古いキーを削除
3. `queryClient.removeQueries` で整合
