# データスキーマ — v0.2

## テーブル一覧
### crops
| カラム | 型 | 説明 |
| --- | --- | --- |
| id | INTEGER PK | 作物 ID |
| name | TEXT | 作物名 |
| category | TEXT | `leaf` `root` `fruit` `flower` 等 |
| variety | TEXT | 品種名（任意） |

### growth_days
| カラム | 型 / 制約 | 説明 |
| --- | --- | --- |
| id | INTEGER PK | レコード ID |
| crop_id | INTEGER FK -> crops.id | 対象作物 |
| region | TEXT NOT NULL | 地域コード（JIS 等を想定） |
| days | INTEGER NOT NULL | 定植から収穫までの日数 |

- `UNIQUE (crop_id, region)` で地域単位の重複登録を禁止。

### price_weekly
| カラム | 型 / 制約 | 説明 |
| --- | --- | --- |
| id | INTEGER PK | レコード ID |
| crop_id | INTEGER FK -> crops.id | 対象作物 |
| week | TEXT NOT NULL | 週識別子（ISO-8601 `YYYY-Www` など） |
| avg_price | REAL | 平均価格（単位: `unit`） |
| stddev | REAL | 価格標準偏差 |
| unit | TEXT NOT NULL DEFAULT '円/kg' | 価格単位 |
| source | TEXT NOT NULL | 取得元識別子 |

- `UNIQUE (crop_id, week)` で作物×週の重複登録を禁止。

### etl_runs
| カラム | 型 / 制約 | 説明 |
| --- | --- | --- |
| id | INTEGER PK | 実行 ID |
| run_at | TEXT NOT NULL | 実行日時（ISO-8601 文字列） |
| status | TEXT NOT NULL | 実行状態コード |
| updated_records | INTEGER NOT NULL | 更新件数 |
| error_message | TEXT | 失敗時のメッセージ |
| state | TEXT | `running` `success` `failure` `stale` |
| started_at | TEXT | 開始時刻（ISO-8601 文字列） |
| finished_at | TEXT | 終了時刻（ISO-8601 文字列） |
| last_error | TEXT | 直近エラーメッセージ |

## 花きデータ取り込み
- `crops.category=flower` を追記し、関連する `growth_days` と `price_weekly` を整備。
- 単位は週次価格へ合わせて正規化し、`unit` に反映。

## 拡張指針
- 将来のカテゴリ追加に備え ENUM 化を検討するが v0.2 では TEXT を継続。
- `favorites` テーブル追加余地を残し、外部キー制約は現状維持。
