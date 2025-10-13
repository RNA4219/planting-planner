# API リファレンス — v0.3

- `GET /api/recommend`: `marketScope`（`national` or `city:<id>`）と `category` クエリを追加。レスポンス形式は変更なし。スコープ未指定は全国平均。
- `GET /api/crops`: `category` フィルタを受け取り、カテゴリタブからの一覧取得に利用。未指定は全件。
- `GET /api/price`: `marketScope` を任意指定。都市データ欠損時は 200 で全国平均値と `fallback=true` を返すレスポンスヘッダーを追加。
- `POST /api/refresh` / `GET /api/refresh/status`: 仕様は v0.2 と同じだが、成功後に `market_metadata` キャッシュの更新を確認するログを出力。
- `GET /api/markets`
  - クエリパラメータなし。`Content-Type: application/json` を付与した `GET` リクエストを受け付ける（`frontend/src/lib/api.ts` が送出）。
  - レスポンス: 200 で `application/json`。ボディは次の構造を持つ。

    ```jsonc
    {
      "markets": [
        {
          "scope": "national" | "city:<id>",
          "display_name": "...",
          "theme": {
            "token": "...",         // クライアントのテーマ解決で利用
            "hex_color": "#RRGGBB",  // 市場テーマカラー
            "text_color": "#RRGGBB"  // 市場テーマ文字色
          }
        }
      ],
      "generated_at": "2024-01-01T00:00:00Z"
    }
    ```

    `markets` 配列と `generated_at` はバックエンドの `metadata_cache` (`cache_key = market_metadata`) に保存されている JSON をそのまま返す。クライアント側では `theme` を UI 用テーマ構造へマッピングした上で、市場選択肢のソースとして利用する。
  - キャッシュ未整備時は 503 (`detail = "market metadata cache not ready"`) を返し、クライアントは内蔵定義 (`MARKET_SCOPE_FALLBACK_DEFINITIONS`) にフォールバックして UI を継続する。`/api/markets` では `fallback` ヘッダーは使用せず、`/api/price` と `/api/recommend` の `fallback` ヘッダーの有無で市場データ欠損を判断する。
