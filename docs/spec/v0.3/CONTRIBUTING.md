# コントリビューション指針 — v0.3

- Issue には市場切替・カテゴリ・Tailwind・Playwright のいずれかタグを付与し、影響範囲を明示。
- 変更は `npm run lint`, `npm run test`, `npm run test:e2e`, `pytest`, `mypy` を通過したログを添付。E2E 失敗時はスクリーンショット共有。
- Tailwind クラス追加時は `tailwind.config.ts` の `market` カラートークンを利用し、独自色は禁止。
- Playwright シナリオは `tests/e2e/README.md` にステップ概要を追記して保守性を確保。
