# データスキーマ - planting-planner v0.1

## データベース
- SQLite を利用
- すべてのテーブルは `id INTEGER PRIMARY KEY AUTOINCREMENT` を持つ

---

## テーブル一覧

### `crops`
| カラム名       | 型      | 説明                |
|----------------|---------|---------------------|
| id             | INTEGER | 主キー              |
| name           | TEXT    | 作物名（ユニーク）  |
| category       | TEXT    | 分類（leaf, root, flower など） |

---

### `growth_days`
| カラム名       | 型      | 説明                  |
|----------------|---------|-----------------------|
| id             | INTEGER | 主キー                |
| crop_id        | INTEGER | crops.id 外部キー     |
| days           | INTEGER | 平均生育日数（単位: 日） |

---

### `prices`
| カラム名       | 型      | 説明                           |
|----------------|---------|--------------------------------|
| id             | INTEGER | 主キー                         |
| crop_id        | INTEGER | crops.id 外部キー              |
| week           | INTEGER | ISO週番号（例: 202540）        |
| price          | REAL    | 単位あたり価格（円/kg 等正規化）|
| source         | TEXT    | データ出典（e-Stat 等）         |

---

### `etl_runs`
| カラム名       | 型      | 説明                           |
|----------------|---------|--------------------------------|
| id             | INTEGER | 主キー                         |
| run_at         | TEXT    | 実行時刻（ISO8601文字列）      |
| status         | TEXT    | 成功/失敗                      |
| updated_records| INTEGER | 更新件数                       |
| error_message  | TEXT    | エラーメッセージ（失敗時）     |

---

## インデックス
- `prices(crop_id, week)` に複合インデックスを付与
- `growth_days.crop_id` にユニーク制約
