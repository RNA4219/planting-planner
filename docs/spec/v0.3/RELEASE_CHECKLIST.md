# リリースチェックリスト — v0.3

## KPI 達成チェック
- [ ] KPI スコアカードを確認し、`reports/release/v0.3/kpi-scorecard.md` を添付した。
- [ ] KPI 集計の生データ (`data/release/v0.3/kpi-extract.csv`) を添付し、メトリクス定義との差異がないことを確認した。

## 未解決課題
- [ ] 未クローズのクリティカル課題一覧 (`reports/release/v0.3/open-blockers.md`) を添付し、影響範囲と対応オーナーを明記した。
- [ ] 既知の軽微課題を `reports/release/v0.3/known-issues.md` に整理し、リリースノートへの反映を確認した。

## フレーク率レポート
- [ ] CI ダッシュボードから `frontend-e2e` のフレーク率を更新し、[flake メトリクス集計](../../reports/ci/frontend-e2e-flake-rate.md) へのリンクを添付した。
- [ ] Playwright 実行結果 HTML を [最新レポート](../../frontend/tests/e2e/report/index.html) として添付し、主要シナリオのスクリーンショットを確認した。
- [ ] Playwright トレース (`../../frontend/tests/e2e/report/trace.zip`) を添付し、再現手順の記録を検証した。

## ロールバック手順
- [ ] `docs/spec/v0.3/DEVELOPMENT.md` のロールバック手順に沿ってチェックポイントを作成し、緊急対応の連絡体制を確認した。
- [ ] ロールバック用のデータバックアップ (`reports/release/v0.3/rollback-plan.md`) を添付した。

## 承認サイン欄
- [ ] QA リード: ______________________
- [ ] プロダクトマネージャー: ______________________
- [ ] エンジニアリングマネージャー: ______________________
