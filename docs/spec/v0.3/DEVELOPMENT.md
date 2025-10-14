# 開発運用 — v0.3

- ブランチ戦略: `feature/v0.3-*` で作業し、Tailwind リファクタと市場切替を分離レビュー。PR は Playwright 追加後に CI 緑でマージ。
- コーディング規約: TypeScript は strict、スタイルは Tailwind ユーティリティを優先し CSS Modules は段階的削除。Python は mypy strict、ruff/black 運用。
- ローカルセットアップ: `npm install && npm run dev` が Tailwind JIT を起動。Playwright は `npx playwright install --with-deps` を初回実行。
- 監視: フロントエンドは `cd frontend && npm run typecheck`, `cd frontend && npm run build`, `npm run lint`, `npm run test`, `npm run test:e2e` を pre-merge チェックに統合し、バックエンドは `ruff check .`, `black --check .`, `pytest`, `mypy` を `push` / `pull_request` で実行。
