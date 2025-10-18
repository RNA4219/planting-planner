# API Reference - planting-planner v0.1

## 基本情報

- Base URL: `https://<backend-domain>/api`
- Content-Type: `application/json`
- 認証: なし（公開利用想定）

---

## Endpoints

### `GET /health`

- **概要**: ヘルスチェック
- **レスポンス例**

```json
{ "status": "ok" }
```

---

### `GET /crops`

- **概要**: 登録済み作物一覧を返す
- **レスポンス**

```json
[
  {
    "id": 1,
    "name": "ほうれん草",
    "category": "leaf"
  },
  ...
]
```

---

### `GET /recommend`

- **概要**: 「今週植えるべき作物」一覧を返す
- **クエリパラメータ**
  - `region` (任意): 推奨ロジックに使用する地域区分（`cold` \| `temperate` \| `warm`、未指定時は `temperate`）
  - `week` (任意): ISO週番号（未指定の場合は現在週）

- **レスポンス**

```json
{
  "week": "2024-W40",
  "region": "temperate",
  "items": [
    {
      "crop": "春菊",
      "growth_days": 56,
      "harvest_week": "2024-W40",
      "sowing_week": "2024-W32",
      "source": "internal"
    }
  ]
}
```

> **備考**: `region` を省略した場合は自動的に `temperate` が適用される。

---

### `GET /price`

- **概要**: 指定した作物の週次価格推移を返す
- **クエリパラメータ**
  - `crop_id` (必須): 価格を取得したい作物ID
  - `frm` (任意): 取得開始週（ISO週形式 `YYYY-Www`）
  - `to` (任意): 取得終了週（ISO週形式 `YYYY-Www`）

- **レスポンス (`PriceSeries`)**

```json
{
  "crop_id": 1,
  "crop": "ほうれん草",
  "unit": "円/kg",
  "source": "seed",
  "prices": [
    {
      "week": "2024-W01",
      "avg_price": 350.5,
      "stddev": 12.3
    }
  ]
}
```

- **404 レスポンス例**

```json
{ "detail": "crop_not_found" }
```

---

### `POST /refresh`

- **概要**: データ更新を非同期でトリガー
- **レスポンス**

```json
{ "state": "running" }
```

- `state`: 更新ジョブの最新状態（`running`/`success`/`failure`/`stale`）

---

### `GET /refresh/status`

- **概要**: 最新の更新ジョブの状態を返す。
- **レスポンス**
  - 履歴が存在しない場合は `state: "stale"` を返す。
  - その際 `started_at` と `finished_at`、`last_error` は `null`。
  - `updated_records` は `0` を返す。

```json
{
  "state": "success",
  "started_at": "2025-10-01T10:30:00Z",
  "finished_at": "2025-10-01T10:32:45Z",
  "updated_records": 120,
  "last_error": null
}
```

- **履歴なしレスポンス例**

```json
{
  "state": "stale",
  "started_at": null,
  "finished_at": null,
  "updated_records": 0,
  "last_error": null
}
```

---

## ステータスコード

- `200`: 成功
- `400`: クエリエラー
- `500`: サーバ内部エラー

---

## 将来拡張

- `/crops/{id}`: 詳細情報取得
- `/favorites`: ユーザーお気に入り管理（※ v0.1 はフロント側 localStorage 管理）
