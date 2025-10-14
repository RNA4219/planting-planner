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
  - GitHub Actions から取得する場合:
    1. `ci.yml` ワークフローの最新成功ランから `frontend e2e (playwright)` ジョブを開く。
    2. アーティファクト `playwright-e2e-metrics.json` をダウンロードし、上記パスへ保存する。
  - CLI でメトリクスを収集する場合は `python -m app.ci.playwright_metrics --workflow-file .github/workflows/ci.yml --job-name "frontend e2e (playwright)" --output reports/ci/playwright-e2e-metrics.json` のように `--job-name` と `--output` 引数を指定する。
  - 添付物: [`playwright-e2e-metrics.json`](https://github.com/R-N-A/planting-planner/actions/workflows/ci.yml)
  - GitHub Actions からの取得手順:
    1. 上記 CI 実行履歴にアクセスし、対象リリースの `frontend e2e (playwright)` が含まれるワークフローを選択する。
    2. 実行詳細の `Artifacts` から `playwright-e2e-metrics.json` をダウンロードする。
  - ローカルで再取得する場合は `cd backend && pip install -r requirements.txt` を行い、`python -m app.ci.playwright_metrics --owner R-N-A --repo planting-planner --workflow-file ci.yml --job-name "frontend e2e (playwright)" --output playwright-e2e-metrics.json` を実行する。
- [ ] Playwright 実行結果 HTML をレビューし、主要シナリオのスクリーンショットを確認した。
  - 添付物: [最新レポート](../../frontend/tests/e2e/report/index.html)
- [ ] Playwright トレースを検証した。
  - 添付物: `../../frontend/tests/e2e/report/trace.zip`

## ロールバック手順
- [ ] `docs/spec/v0.3/DEVELOPMENT.md` のロールバック手順に沿ってチェックポイントを作成し、緊急対応の連絡体制を確認した。
  - 添付物: `docs/spec/v0.3/DEVELOPMENT.md`
- [ ] ロールバック用のデータバックアップを確認した。
  - 添付物: `reports/release/v0.3/rollback-plan.md`

## 承認サイン欄
- [ ] QA リード: ______________________
- [ ] プロダクトマネージャー: ______________________
- [ ] エンジニアリングマネージャー: ______________________
