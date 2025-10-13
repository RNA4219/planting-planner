# テスト計画 — v0.3

- 単体: Python は市場スコープ引数の分岐とフォールバック検証、TypeScript は store reducer と Tailwind クラス付与のスナップショット。
- 結合: React Testing Library で市場切替→API 呼出→レンダリングをモックサーバーと共に確認。カテゴリタブのフィルタリングも同一シナリオで網羅。
- E2E: Playwright `tests/e2e/market-toggle.spec.ts` 等で市場切替、カテゴリ遷移、推薦カード遷移を検証。CI は push/pull_request トリガーで `npm run test:e2e` を実行。
- パフォーマンス: Lighthouse CI で市場切替後の再描画を測定し、300ms 超過時は回帰ブロッカー扱い。
