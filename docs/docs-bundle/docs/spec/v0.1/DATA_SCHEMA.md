# データスキーマ - planting-planner v0.1

## データベース

- SQLite を利用
- すべてのテーブルは `id INTEGER PRIMARY KEY AUTOINCREMENT` を持つ

---

## テーブル一覧

### `crops`

- `id` (INTEGER): 主キー。
- `name` (TEXT): 作物名。ユニーク制約あり。
- `category` (TEXT): 分類。例: `leaf`、`root`、`flower`。

---

### `growth_days`

- `id` (INTEGER): 主キー。
- `crop_id` (INTEGER): `crops.id` への外部キー。
- `region` (TEXT): 地域区分。`cold`（寒冷地）、`temperate`（温暖地）、
  `warm`（暖地）。
- `days` (INTEGER): 平均生育日数。単位は日。

---

### `price_weekly`

- `id` (INTEGER): 主キー。
- `crop_id` (INTEGER): `crops.id` への外部キー。
- `week` (TEXT): ISO 週番号。例: `2025-W40`。
- `avg_price` (REAL): 平均価格。単位あたり（円/kg など）に正規化。
  `NULL` の場合はデータ欠損を示す。
- `stddev` (REAL): 価格の標準偏差。`NULL` の場合はデータ欠損。
- `unit` (TEXT): 価格単位。`NOT NULL` で、デフォルトは `円/kg`。
- `source` (TEXT): データ出典。`NOT NULL`。例: e-Stat。

- 一意制約: `UNIQUE (crop_id, week)`

---

### `etl_runs`

- `id` (INTEGER): 主キー。
- `run_at` (TEXT): 実行時刻。ISO8601 文字列。
- `status` (TEXT): 外部公開ステータス。成功、失敗、実行開始時は
  `running`。
- `updated_records` (INTEGER): 更新件数。
- `error_message` (TEXT): エラーメッセージ。失敗時に設定される。
- `state` (TEXT): ETL ジョブ内部状態。`running`、`success`、`failure`、
  `stale`。
- `started_at` (TEXT): 実行開始時刻。ISO8601 文字列。
- `finished_at` (TEXT): 実行終了時刻。ISO8601 文字列。
- `last_error` (TEXT): 直近のエラー内容。リトライ用。

---

## インデックス

- `idx_price_weekly_crop_week`: `price_weekly(crop_id, week)` に複合インデックスを付与
- `growth_days(crop_id, region)` にユニーク制約
