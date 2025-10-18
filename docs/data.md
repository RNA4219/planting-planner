# データソースとシード運用

## 公的データ取得一覧

| 出典 | 統計/資料 | 公開 URL | 最終取得日時 (JST) | 取込スクリプト | 主な利用先 |
| --- | --- | --- | --- | --- | --- |
| e-Stat | 青果物卸売市場調査（週次卸売価格） | https://www.e-stat.go.jp/stat-search/database?page=1&toukei=00500215 | 2024-12-05T09:30+09:00（開発用ダミーデータ最終更新時点） | `backend/app/etl` 配下の ETL パイプライン | `price_weekly.sample.json` を介した週次市場価格の投入、および `backend/app/seed` でのシードデータ生成 |
| 農林水産省 (MAFF) | 野菜生産出荷統計（令和5年産 野菜品目別作型別作付面積・出荷量） | https://www.maff.go.jp/j/tokei/kouhyou/sakumotu/index.html | 2024-11-20T08:15+09:00（開発用ダミーデータ最終更新時点） | `backend/app/seed/data_loader.py` | 生育日数 (`data/growth_days.json`)・市場カテゴリ定義 (`data/market_scopes.json`) などシード投入用のマスタ整備 |

- 取得日時は JST で記録し、再取得時には本表を更新する。
- ETL 経由で加工した JSON/SQLite は Git に追跡され、ローカル差分で加工内容を確認できる。

## Seed SQLite スナップショット運用

### 命名規約
- スナップショットは `data/seed-YYYYMMDD.db` とし、`YYYYMMDD` は生成時点の JST 日付を 8 桁で付与する。
- `data/seed.db` は開発用のローカルキャッシュとして扱い、日付付きスナップショットのみをリリース資産としてコミットする。

### 更新フロー
1. 最新ソースを取得後、必要に応じて `poetry run python -m backend.app.etl_runner` で ETL を実行し、加工済み JSON を更新する。
2. データ検証（後述）で JSON/DB スキーマの整合性と回帰を確認する。
3. `scripts/export_seed.py` を用いて `data/seed-YYYYMMDD.db` を生成する。出力先は既存ファイルと衝突しない日付にする。
4. 直前のスナップショットと比較し、差分を記録する。
   - `sqlite3 data/seed-YYYYMMDD.db '.dump' > tmp/seed-YYYYMMDD.sql`
   - `sqlite3 data/seed-<prev>.db '.dump' > tmp/seed-<prev>.sql`
   - `diff -u tmp/seed-<prev>.sql tmp/seed-YYYYMMDD.sql > docs/data-diff/seed-YYYYMMDD.diff`
   - `docs/data-diff/` 配下の diff を PR に含め、レビュー時に変更点を共有する。
5. スナップショットと diff をコミットし、`docs/data.md` の取得日時・備考を更新する。

### `scripts/export_seed.py` の利用イメージ
- 同スクリプトは `backend/app/seed` のロジックを用いて SQLite を構築する。
- 利用例：
  ```bash
  poetry run python scripts/export_seed.py --output data/seed-YYYYMMDD.db \
    --data-dir data --data-date 2024-12-05
  ```
- 省略時は `--output` が未指定でも `data/seed-YYYYMMDD.db` として当日付のファイルを生成する。
- `--data-date` を省略した場合は当日の日付がメタデータ `data_fetched_at` に記録される。
- スクリプトは生成日時や使用した JSON のコミットハッシュなどのメタデータを `metadata` テーブルに書き込み、レビュー時に出典を追跡できるようにする。
  - `metadata` テーブルには `schema_version`・`data_fetched_at`・`git_commit`・`exported_at` のキーが `TEXT` 形式で保存される。

## 生成データの検証手順
- シード投入の動作確認：
  ```bash
  poetry run python -m backend.app.seed
  ```
  - 既定の `data/` ディレクトリから JSON を読み込み、ローカル SQLite にシードできることを確認する。
- スキーマ・整合性チェック：
  ```bash
  poetry run pytest tests/backend/app/test_seed.py
  poetry run pytest tests/backend/app/test_db_schema.py
  ```
  - 主要テーブル・制約が変更されていないことを保証する。
- ETL の健全性確認：
  ```bash
  poetry run pytest tests/backend/app/test_etl.py
  ```
  - 週次価格や市場メタデータの再計算が期待通りであることを検証する。

検証の結果がすべてグリーンであることを確認したうえで、スナップショットと差分をリリースする。
