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
| カラム名       | 型      | 説明                                      |
|----------------|---------|-------------------------------------------|
| id             | INTEGER | 主キー                                    |
| crop_id        | INTEGER | crops.id 外部キー                         |
| region         | TEXT    | "cold"（寒冷地）/"temperate"（温暖地）/"warm"（暖地） |
| days           | INTEGER | 平均生育日数（単位: 日）                  |

---

### `price_weekly`
| カラム名       | 型      | 説明                                                     |
|----------------|---------|----------------------------------------------------------|
| id             | INTEGER | 主キー                                                   |
| crop_id        | INTEGER | crops.id 外部キー                                        |
| week           | TEXT    | ISO 週番号（例: 2025-W40）                               |
| avg_price      | REAL    | 平均価格（単位あたり、円/kg 等正規化。NULL=データ欠損） |
| stddev         | REAL    | 価格の標準偏差（NULL=データ欠損）                        |
| unit           | TEXT    | 価格単位（NOT NULL、デフォルト: `円/kg`）                |
| source         | TEXT    | データ出典（NOT NULL、例: e-Stat）                        |

- 一意制約: `UNIQUE (crop_id, week)`

---

### `etl_runs`
| カラム名       | 型      | 説明                           |
|----------------|---------|--------------------------------|
| id             | INTEGER | 主キー                         |
| run_at         | TEXT    | 実行時刻（ISO8601文字列）      |
| status         | TEXT    | 外部公開ステータス（成功/失敗。実行開始時は `running`） |
| updated_records| INTEGER | 更新件数                       |
| error_message  | TEXT    | エラーメッセージ（失敗時）     |
| state          | TEXT    | ETL ジョブ内部状態（`running`/`success`/`failure`/`stale`） |
| started_at     | TEXT    | 実行開始時刻（ISO8601文字列）  |
| finished_at    | TEXT    | 実行終了時刻（ISO8601文字列）  |
| last_error     | TEXT    | 直近のエラー内容（リトライ用） |

---

## インデックス
- `idx_price_weekly_crop_week`: `price_weekly(crop_id, week)` に複合インデックスを付与
- `growth_days(crop_id, region)` にユニーク制約
