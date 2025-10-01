# ETL 仕様 - planting-planner v0.1

## 処理概要
ETL (Extract, Transform, Load) により、公的市場データを週単位に整形し SQLite に格納する。

## Extract
- e-Stat API または CSV/Excel ダウンロード
- 花きデータは農水省の公開ファイルから抽出
- スケジュール: 手動「更新」ボタン → バックエンドで非同期実行

## Transform
- 単位変換（例: 円/10本 → 円/kg）
- 週番号（ISO 週）に丸め込み
- 欠損値処理
  - 過去3週の平均値で補完
  - それも不可なら NULL のまま保持

## Load
- SQLite に UPSERT
- テーブル構造:
  - `crops`（作物マスタ）
  - `prices`（市場価格）
  - `growth_days`（平均生育日数）

## エラーハンドリング
- ダウンロード失敗 → リトライ3回まで
- CSV フォーマット不一致 → スキップしてログ出力
- 失敗時も DB は前回データを維持

## ログ
- `etl_runs` テーブルに記録
  - `state`: ジョブの現在ステータス（`running`/`success`/`failure`）を保持
  - `started_at`: ジョブ開始時刻。マイグレーション後は従来の `run_at` と同値で初期化
  - `finished_at`: 正常終了・失敗時の完了時刻。実行中は `NULL`
  - `last_error`: 直近の失敗メッセージ。成功時に `NULL` に戻し、失敗時に更新
  - 実行時刻
  - 成功/失敗
  - 更新件数
  - エラーメッセージ（失敗時）

実装では失敗を検知すると `finished_at` と `last_error` を更新し、リトライ後に成功した場合でも `last_error` は `NULL` にリセットされる。これにより UI は最新のジョブ状態と直近の障害内容のみを参照できる。
