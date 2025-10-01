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

* **概要**: 登録済み作物一覧を返す
* **レスポンス**

```json
[
  {
    "id": 1,
    "name": "ほうれん草",
    "growth_days": 40,
    "category": "leaf"
  },
  ...
]
```

---

### `GET /recommend`

* **概要**: 「今週植えるべき作物」一覧を返す
* **クエリパラメータ**

  * `week` (任意): ISO週番号（未指定の場合は現在週）
* **レスポンス**

```json
{
  "week": 2025,
  "items": [
    {
      "crop": "春菊",
      "harvest_week": 2040,
      "sowing_week": 2025,
      "source": "e-Stat"
    }
  ]
}
```

---

### `POST /refresh`

* **概要**: データ更新を非同期でトリガー
* **レスポンス**

```json
{ "status": "refresh started" }
```

---

### `GET /refresh/status`

* **概要**: 最新の更新ジョブの状態を返す
* **レスポンス**

```json
{
  "last_run": "2025-10-01T10:30:00Z",
  "status": "success",
  "updated_records": 120
}
```

---

## ステータスコード

* `200`: 成功
* `400`: クエリエラー
* `500`: サーバ内部エラー

---

## 将来拡張

* `/crops/{id}`: 詳細情報取得
* `/favorites`: ユーザーお気に入り管理（※ v0.1 はフロント側 localStorage 管理）
