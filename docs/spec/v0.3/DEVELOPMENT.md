# 開発運用 — v0.3

- ブランチ戦略: `feature/v0.3-*` で作業し、Tailwind リファクタと市場切替を分離レビュー。PR は Playwright 追加後に CI 緑でマージ。
- コーディング規約: TypeScript は strict、スタイルは Tailwind ユーティリティを優先し CSS Modules は段階的削除。Python は mypy strict、ruff/black 運用。
- ローカルセットアップ: `npm install && npm run dev` が Tailwind JIT を起動。Playwright は `npx playwright install --with-deps` を初回実行。
- 監視: フロントエンドは `cd frontend && npm run typecheck`, `cd frontend && npm run build`, `cd frontend && npm run lint`, `cd frontend && npm run test`, `cd frontend && npm run test:e2e` を pre-merge チェックに統合し、バックエンドは `ruff check .`, `black --check .`, `pytest`, `mypy` を `push` / `pull_request` で実行。
- Playwright ダッシュボード: GitHub Actions の `frontend-e2e` 完了後に `frontend-e2e-metrics` が `python -m app.ci.playwright_metrics --workflow-file ci.yml` を呼び出し、`playwright-e2e-metrics.json` をアーティファクトで公開。ローカル確認は `cd backend && pip install -r requirements.txt` 実行後に `python -m app.ci.playwright_metrics --owner planting-planner --repo planting-planner --workflow-file ci.yml`。生成 JSON 例: `{"success_count": 18, "failure_count": 2, "flaky_count": 3, "flake_rate": 0.15}`。フレーク率が 0.2 を超えた場合は、Playwright テストの安定化タスクをオーナーが優先検討する。
