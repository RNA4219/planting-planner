# API リファレンス — v0.2

## 共通仕様

- ベース URL、認証不要、`Content-Type: application/json` は v0.1 と同一。
- レスポンス: 成功 200、入力不正 400、サーバエラー 500。

## GET /api/crops

- すべての作物を返す。
- v0.2 ではクライアント側で検索フィルタを実装するため追加パラメータなし。
- 将来拡張: `search` クエリを追加し、名前・カテゴリ部分一致検索をサーバ側で実装予定。

## GET /api/recommend

- 地域・週指定で逆算した作付け推薦を返す。
- 花きカテゴリも既存ロジックに乗せて返却する。

## GET /api/price

- 指定作物の週次価格推移を返す。
- 花きカテゴリでも単位正規化済みデータを返す。

## POST /api/refresh

- 非同期で ETL を起動する。レスポンスは v0.1 と同じくステータスのみ。

## GET /api/refresh/status

- 直近の ETL 実行状態を返す。
- レスポンス例:
```json
{
  "state": "success",
  "started_at": "2025-10-01T10:30:00Z",
  "finished_at": "2025-10-01T10:32:45Z",
  "updated_records": 120,
  "last_error": null
}
```
- `state` は `running` `success` `failure` `stale` のいずれか。
- フロントエンドは `updated_records` をトースト文言に利用する。

## 今後の拡張余地

- `GET /api/crops/{id}`、`POST /api/favorites` はスキーマ上の余地のみ確保。
- トークン認証導入時に共通ヘッダー仕様を追加予定。
