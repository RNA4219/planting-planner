# タスク分解 — v0.3

1. API 層: `marketScope` 受理ロジックと単体テスト追加。
2. フロント基盤: Tailwind 設定と共通レイアウトの置換、アクセシビリティ確認。
   - [x] App ヘッダー/メインの Tailwind リファクタ: `frontend/tests/app.snapshot.test.tsx` の期待値を Tailwind クラス前提で赤にし、`frontend/src/App.tsx` から `app__*` クラスと `MARKET_FALLBACK_NOTICE_STYLE` を除去してユーティリティクラスへ移行した上でテストを緑化する。
     - 完了理由: `frontend/src/App.tsx` で Tailwind ユーティリティクラスへ置換済み。
   - [x] SearchControls を Tailwind ベースへ置換: `frontend/src/components/__tests__/SearchControls.test.tsx` を Tailwind レイアウト検証で更新し、`frontend/src/components/SearchControls.tsx` をユーティリティクラス主体に書き換えてテストを通す。
     - 完了理由: `frontend/src/components/SearchControls.tsx` を Tailwind ユーティリティ中心に書き換え済み。
3. UI 実装: 市場切替コンポーネントとカテゴリタブのステート連携。
4. QA: React Testing Library 結合テスト更新と Playwright シナリオ作成。
5. DevOps: CI に `npm run test:e2e` と Lighthouse スモークを追加。
