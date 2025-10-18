# テスト計画 — v0.3

- 単体: Python は市場スコープ引数の分岐を検証する。
  TypeScript は store reducer と Tailwind クラス付与をスナップショット確認する。
- 結合: React Testing Library で市場切替→API 呼出→レンダリングをモックサーバーと共に確認する。
  カテゴリタブのフィルタリングも同一シナリオで網羅する。
- E2E: Playwright `tests/e2e/market-toggle.spec.ts` で市場切替を検証する。
  `tests/e2e/checkout-flow.spec.ts` で SearchControls の週・地域更新を確認する。
  同テストでカテゴリ遷移とフォールバック通知も確認し、CI では push/pull_request トリガーで
  `npm run test:e2e` を実行する。
- パフォーマンス: Lighthouse CI で市場切替後の再描画を測定する。
  300ms を超えた場合は回帰ブロッカーとして扱う。
