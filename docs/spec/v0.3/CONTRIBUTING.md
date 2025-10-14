# コントリビューション指針 — v0.3

- Issue には市場切替・カテゴリ・Tailwind・Playwright のいずれかタグを付与し、影響範囲を明示。
- 変更は以下の検証コマンドを対象ディレクトリで実行し、通過ログを添付。E2E 失敗時はスクリーンショット共有。
  - `cd frontend && npm run typecheck`
  - `cd frontend && npm run lint`
  - `cd frontend && npm run test`
  - `cd frontend && npm run build`
  - `cd frontend && npm run test:e2e`
  - `cd backend && ruff check .` (CI: backend-lint)
  - `cd backend && black --check .` (CI: backend-lint)
  - `cd backend && mypy`
  - `cd backend && pytest`
- Tailwind クラス追加時は `tailwind.config.ts` の `market` カラートークンを利用し、独自色は禁止。
- Playwright シナリオは `tests/e2e/README.md` にステップ概要を追記して保守性を確保。
