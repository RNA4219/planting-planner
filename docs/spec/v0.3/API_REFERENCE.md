# API リファレンス — v0.3

- `GET /api/recommend`: `marketScope`（`national` or `city:<id>`）と `category` クエリを追加。レスポンス形式は変更なし。スコープ未指定は全国平均。
- `GET /api/crops`: `category` フィルタを受け取り、カテゴリタブからの一覧取得に利用。未指定は全件。
- `GET /api/price`: `marketScope` を任意指定。都市データ欠損時は 200 で全国平均値と `fallback=true` を返すレスポンスヘッダーを追加。
- `POST /api/refresh` / `GET /api/refresh/status`: 仕様は v0.2 と同じだが、成功後に `market_metadata` キャッシュの更新を確認するログを出力。
