# ETL 仕様 — v0.2

## 概要
- `/api/refresh` で非同期起動する ETL は花きデータを含む全カテゴリを対象。
- ステージングはメモリ上で行い、SQLite への UPSERT で整合性を維持。

## Extract
- e-Stat API、花き流通統計 CSV/Excel をダウンロード。
- HTTP リトライ: 最大 3 回、指数バックオフ。
- ファイルは一時ディレクトリに保存し、処理後削除。

## Transform
- 単位正規化: 花きデータを円/本や円/束から共通単位へ変換。
- 欠損値補完: 直近 3 週平均。データ不足時は最新値を再利用。
- 日付処理: 週開始日を ISO 週の月曜日へ丸める。

## Load
- `price_weekly` に対し `ON CONFLICT(crop_id, week)` で UPSERT。
- 更新件数を計測し `etl_runs.updated_records` に保存。
- エラー時は `etl_runs.state=failure` とし、`last_error` を記録。

## ロギング
- INFO: 取得件数、変換サマリ、更新件数。
- WARNING: 欠損値補完や単位変換での想定外入力。
- ERROR: 通信失敗、構造不一致等。アラート対象。

## スケジューリング
- 手動更新（/refresh）を前提。将来的な自動化に向け cron タスク対応を検討。
