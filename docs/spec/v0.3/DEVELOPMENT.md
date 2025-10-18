# 開発運用 — v0.3

- ブランチ戦略: `feature/v0.3-*` で作業し、Tailwind リファクタと市場切替を
  分離レビュー。PR は Playwright 追加後に CI 緑でマージ。
- コーディング規約: TypeScript は strict、スタイルは Tailwind ユーティリティを
  優先し CSS Modules は段階的削除。Python は mypy strict、ruff/black 運用。
- ローカルセットアップ: `npm install && npm run dev` が Tailwind JIT を起動。
  Playwright は `npx playwright install --with-deps` を初回実行。
- 監視: フロントエンドは `cd frontend && npm run typecheck`,
  `cd frontend && npm run build`, `cd frontend && npm run lint`,
  `cd frontend && npm run test`, `cd frontend && npm run test:e2e` を pre-merge
  チェックに統合し、バックエンドは `ruff check .`, `black --check .`,
  `pytest`, `mypy` を `push` / `pull_request` で実行。
- Playwright ダッシュボード: GitHub Actions の `frontend e2e (playwright)` 完了後に
  `frontend-e2e-metrics` が `python -m app.ci.playwright_metrics` を呼び出し、
  `--workflow-file ci.yml` と `--job-name "frontend e2e (playwright)"` を指定して
  実行する形で
  `playwright-e2e-metrics.json` をアーティファクトで公開。ローカル確認は
  `cd backend && pip install -r requirements.txt` 実行後に
  `python -m app.ci.playwright_metrics --owner R-N-A --repo planting-planner`
  と `--workflow-file ci.yml --job-name "frontend e2e (playwright)"` を指定する。
  ローカル実行フローでも同じジョブ名引数を必須指定とし、GitHub Actions
  ダッシュボード（R-N-A/planting-planner）とローカル結果を揃える。生成 JSON 例:
  `{"success_count":18,"failure_count":2,"flaky_count":3,"flake_rate":0.15}`。
  フレーク率が 0.2 を超えた場合は、Playwright テストの安定化タスクをオーナーが優先
  検討する。
