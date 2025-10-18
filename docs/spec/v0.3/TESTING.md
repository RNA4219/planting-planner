# テスト計画 — v0.3

- 単体: Python は市場スコープ引数の分岐とフォールバック検証、TypeScript は store
  reducer と Tailwind クラス付与のスナップショット。
- 結合: React Testing Library で市場切替→API 呼出→レンダリングをモックサーバーと共に
  確認。カテゴリタブのフィルタリングも同一シナリオで網羅。
- E2E:
  - Playwright `tests/e2e/market-toggle.spec.ts` で市場切替、SearchControls の週・地域更新を
    検証。
  - `tests/e2e/checkout-flow.spec.ts` でカテゴリ遷移とフォールバック通知を検証。
  - CI は push/pull_request トリガーで `npm run test:e2e` を実行。
- パフォーマンス: Lighthouse CI で市場切替後の再描画を測定し、300ms 超過時は回帰ブロッ
  カー扱い。
