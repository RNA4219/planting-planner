# リリースチェックリスト — v0.3

## KPI 達成チェック
- [ ] KPI スコアカードを確認した。
  - 添付物: `reports/release/v0.3/kpi-scorecard.md`
- [ ] KPI 集計の生データの整合性を確認した。
  - 添付物: `data/release/v0.3/kpi-extract.csv`

## 未解決課題
- [ ] 未クローズのクリティカル課題を精査し、影響範囲と対応オーナーを明記した。
  - 添付物: `reports/release/v0.3/open-blockers.md`
- [ ] 既知の軽微課題を整理し、リリースノートへの反映を確認した。
  - 添付物: `reports/release/v0.3/known-issues.md`

## フレーク率レポート
- [ ] CI ダッシュボードから `frontend e2e (playwright)` のフレーク率を更新した。
  - 添付物: `reports/ci/playwright-e2e-metrics.json`（CI アーティファクト `playwright-e2e-metrics.json` を保存する）
  - 取得手順:
    - `mkdir -p reports/ci` を実行して保存先を用意する。
    - GitHub Actions から取得する場合:
      1. `ci.yml` ワークフローの対象ランから `frontend e2e (playwright)` ジョブを開く。
      2. 実行詳細の `Artifacts` から `playwright-e2e-metrics.json` をダウンロードし、`reports/ci/playwright-e2e-metrics.json` として保存する。
    - CLI でメトリクスを収集する場合:
      ```bash
      python -m app.ci.playwright_metrics --owner R-N-A --repo planting-planner --workflow-file ci.yml --job-name "frontend e2e (playwright)" --output reports/ci/playwright-e2e-metrics.json
      ```
    - 備考: GitHub API はワークフローファイル名のみを受け付けるため `ci.yml` を指定する（フルパスを渡すと 404 エラーになる既知事象を 2025-10-14 に解消済み）。
- [ ] Playwright 実行結果 HTML をレビューし、主要シナリオのスクリーンショットを確認した。
  - 添付物: `frontend/playwright-report/index.html`（CI アーティファクト `playwright-report` の HTML レポートを保存する）
  - GitHub Actions から取得する場合:
    1. `ci.yml` ワークフローの最新成功ランから `frontend e2e (playwright)` ジョブを開く。
    2. アーティファクト `playwright-report` をダウンロードし、展開して `frontend/playwright-report/index.html` を保存する（成功ランでも保存される）。
  - アーティファクトが生成されていない場合はローカルで `cd frontend && npm install` を実行した後に `npm run test:e2e` を実行し、`frontend/playwright-report/index.html` を再生成する。
- [ ] Playwright トレースを検証した。
  - 添付物: `frontend/test-results/trace.zip`（CI アーティファクト `frontend/test-results/trace.zip` を保存する）
  - GitHub Actions から取得する場合:
    1. 上記と同じ `frontend e2e (playwright)` ジョブでアーティファクト `frontend/test-results/trace.zip` をダウンロードする（成功ランでも保存される）。
  - アーティファクトが生成されていない場合は上記と同じく `cd frontend && npm run test:e2e` を実行し、`frontend/test-results/trace.zip` を再生成する。

## ロールバック手順
- [ ] `docs/spec/v0.3/DEVELOPMENT.md` のロールバック手順に沿ってチェックポイントを作成し、緊急対応の連絡体制を確認した。
  - 添付物: `docs/spec/v0.3/DEVELOPMENT.md`
- [ ] ロールバック用のデータバックアップを確認した。
  - 添付物: `reports/release/v0.3/rollback-plan.md`

## 承認サイン欄
- [ ] QA リード: ______________________
- [ ] プロダクトマネージャー: ______________________
- [ ] エンジニアリングマネージャー: ______________________
