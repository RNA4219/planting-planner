# E2E テスト指針

- Playwright で市場トグルとカテゴリ遷移を監視する。
- `market-toggle.spec.ts` は API をモックし、全国→都市→フォールバックのリクエスト順序を検証する。
- ベース URL やモック設定は `playwright.config.ts` で集中管理する想定。
- 実装後は `npm run test:e2e` を実行すると、ビルドと Playwright による E2E テストが一括で動作する。
