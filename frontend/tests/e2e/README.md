# E2E テスト指針
<!-- markdownlint-disable MD013 -->

- Playwright で市場トグルとカテゴリ遷移を監視する。
- `market-toggle.spec.ts` は API をモックし、全国→都市→フォールバックのリクエスト順序を検証する。
- `checkout-flow.spec.ts` は SearchControls で週・地域を変更して送信後、カテゴリ切替とフォールバック通知までのフローを検証する。
- `share.spec.ts` は 検索→地域切替→手動更新→オフライン化→共有の経路と、Web Share API 非対応時のクリップボードフォールバックを検証し、共有トーストと telemetry 送信をアサートする。
- ベース URL やモック設定は `playwright.config.ts` で集中管理する想定。
- 実行前に `npm ci` と `npx playwright install` を完了させ、ブラウザ依存関係を揃える。
- `share.spec.ts` の事前準備では `page.addInitScript` で `navigator.share`／`navigator.clipboard.writeText` を差し替え、`navigator.webdriver` を `false` に上書きしたうえで `navigator.onLine` の getter を切り替えて `online/offline` イベントを発火させること。
- `npm run test:e2e` でビルドと Playwright の E2E テスト実行が一括で行われる。
