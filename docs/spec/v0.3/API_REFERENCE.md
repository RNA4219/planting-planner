# API リファレンス — v0.3

- `GET /api/recommend`: `marketScope`（`national` or `city:<id>`）と `category` クエリを追加。レスポンス形式は変更なし。スコープ未指定は全国平均。
  - 市場データ欠損時は 200 で全国平均へフォールバックし、レスポンスヘッダーに `fallback: true` と `access-control-expose-headers: fallback` を付与する。通常応答でも `access-control-expose-headers: fallback` を常時付与し、`fallback: true` ヘッダーが存在する場合のみフォールバック検知として扱う。クライアントはヘッダー差分で UI の注意喚起（例: トースト表示）やローカルキャッシュの利用可否を判定する。
- `GET /api/crops`: `category` フィルタを受け取り、カテゴリタブからの一覧取得に利用。未指定は全件。
- `GET /api/price`: `marketScope` を任意指定。都市データ欠損時は 200 で全国平均値と `fallback: true` を返すレスポンスヘッダーを追加し、通常応答でも `access-control-expose-headers: fallback` を常時付与する。`fallback: true` ヘッダーはフォールバック時のみ付与され、クライアントはヘッダー差分でフォールバックを検知する。
- `POST /api/refresh` / `GET /api/refresh/status`: 仕様は v0.2 と同じだが、成功後に `market_metadata` キャッシュの更新を確認するログを出力。
- `GET /api/markets`
  - クエリパラメータなし。`Content-Type: application/json` を付与した `GET` リクエストを受け付ける（`frontend/src/lib/api.ts` が送出）。
  - レスポンス: 200 で `application/json`。ボディは次の構造を持つ。

    ```json
    {
      "markets": [
        {
          "scope": "national" | "city:<id>",
          "display_name": "...",
          "timezone": "Asia/Tokyo",
          "priority": 10,
          "theme": {
            "token": "...",
            "hex_color": "#RRGGBB",
            "text_color": "#RRGGBB"
          },
          "effective_from": "2024-W02",
          "categories": [
            {
              "category": "leaf",
              "display_name": "葉菜類",
              "priority": 5,
              "source": "seed"
            },
            {
              "category": "root",
              "display_name": "根菜類",
              "priority": 10,
              "source": "seed"
            },
            {
              "category": "flower",
              "display_name": "花き",
              "priority": 100,
              "source": "fallback"
            }
          ]
        }
      ],
      "generated_at": "2024-01-01T00:00:00Z"
    }
    ```

    `markets` 配列と `generated_at` はバックエンドの `metadata_cache` (`cache_key = market_metadata`) に保存されている JSON をそのまま返す。`timezone` は市場データのローカルタイムゾーン、`priority` は UI 並び順を決める整数、`effective_from` は最新市場データの適用開始 ISO 週（例: `YYYY-Www`。市場データが未投入の場合は `null`）を示す。`categories` は市場ごとのカテゴリ定義を保持するオブジェクト配列で、各要素にカテゴリ識別子 (`category`)、表示名 (`display_name`)、優先度 (`priority`)、データ由来 (`source`) を含む。`source` はシード投入済みデータなら `seed`、市場価格からの動的復元なら `fallback` となる。クライアント側では `theme` を UI 用テーマ構造へマッピングし、カテゴリタブは `categories` を優先的に利用しつつ欠損時は従来フォールバックと整合する。

  - キャッシュ未整備時は 503 (`detail = "market metadata cache not ready"`) を返し、クライアントは内蔵定義 (`MARKET_SCOPE_FALLBACK_DEFINITIONS`) にフォールバックして UI を継続する。`/api/markets` では `fallback` ヘッダーは使用せず、`/api/price` と `/api/recommend` の `fallback` ヘッダーの有無で市場データ欠損を判断する。
