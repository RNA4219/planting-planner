# E2E テスト指針

- Playwright で市場トグルとカテゴリ遷移を監視する。
- `market-toggle.spec.ts` は API をモックし、全国→都市→フォールバックのリクエスト順序を検証する。
- `checkout-flow.spec.ts` は SearchControls で週・地域を変更して送信後、カテゴリ切替とフォールバック通知までのフローを検証する。
- ベース URL やモック設定は `playwright.config.ts` で集中管理する想定。
- 実行前に `npm ci` と `npx playwright install` を完了させ、ブラウザ依存関係を揃える。
- `npm run test:e2e` でビルドと Playwright の E2E テスト実行が一括で行われる。
