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
| カラム | 型 | 説明 |
| --- | --- | --- |
| crop_id | INTEGER FK -> crops.id | 対象作物 |
| region | TEXT | 地域コード |
| days_to_maturity | INTEGER | 定植から収穫までの日数 |

### price_weekly
| カラム | 型 | 説明 |
| --- | --- | --- |
| crop_id | INTEGER FK | 対象作物 |
| region | TEXT | 地域コード |
| week_start | DATE | 週開始日 |
| price | REAL | 標準化後価格 |
| unit | TEXT NOT NULL | 価格単位（例: 円/㎏） |

### etl_runs
| カラム | 型 | 説明 |
| --- | --- | --- |
| id | INTEGER PK | 実行 ID |
| state | TEXT | `running` `success` `failure` `stale` |
| started_at | DATETIME | 開始時刻 |
| finished_at | DATETIME | 終了時刻 |
| updated_records | INTEGER | 更新件数 |
| last_error | TEXT | 直近エラーメッセージ |

## 花きデータ取り込み
- `crops.category=flower` を追記し、関連する `growth_days` と `price_weekly` を整備。
- 単位は週次価格へ合わせて正規化し、`unit` に反映。

## 拡張指針
- 将来のカテゴリ追加に備え ENUM 化を検討するが v0.2 では TEXT を継続。
- `favorites` テーブル追加余地を残し、外部キー制約は現状維持。
