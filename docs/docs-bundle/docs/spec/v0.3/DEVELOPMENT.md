# 開発運用 — v0.3

- ブランチ戦略:
  - `feature/v0.3-*` で作業する。
  - Tailwind リファクタと市場切替を分離レビューする。
  - PR は Playwright 追加後に CI 緑でマージする。
- コーディング規約:
  - TypeScript は strict 設定を維持する。
  - スタイルは Tailwind ユーティリティを優先する。
  - CSS Modules は段階的に削除する。
  - Python は mypy strict と ruff/black を運用する。
- ローカルセットアップ:
  - `npm install && npm run dev` で Tailwind JIT を起動する。
  - 初回は `npx playwright install --with-deps` を実行する。
- 監視:
  - フロントエンドは次のコマンドを pre-merge チェックに統合する。
    - `cd frontend && npm run typecheck`
    - `cd frontend && npm run build`
    - `cd frontend && npm run lint`
    - `cd frontend && npm run test`
    - `cd frontend && npm run test:e2e`
  - バックエンドは次のコマンドを `push` / `pull_request` で実行する。
    - `ruff check .`
    - `black --check .`
    - `pytest`
    - `mypy`
- Playwright ダッシュボード:
  - GitHub Actions の `frontend e2e (playwright)` 完了後に
    `frontend-e2e-metrics` が
    `python -m app.ci.playwright_metrics --workflow-file ci.yml --job-name`
    `"frontend e2e (playwright)"` を呼び出し、
    `playwright-e2e-metrics.json` をアーティファクトで公開する。
  - ローカル確認は `cd backend && pip install -r requirements.txt` 実行後に
    `python -m app.ci.playwright_metrics --owner R-N-A --repo`
    `planting-planner --workflow-file ci.yml --job-name "frontend e2e`
    `(playwright)"` を実行する。
  - ローカル実行フローでも同じジョブ名引数を必須指定とし、
    GitHub Actions ダッシュボード（R-N-A/planting-planner）とローカル結果を
    揃える。
  - 生成 JSON 例: `{"success_count": 18, "failure_count": 2, "flaky_count": 3,
    "flake_rate": 0.15}`。
  - フレーク率が 0.2 を超えた場合は Playwright テストの安定化タスクを
    オーナーが優先検討する。
