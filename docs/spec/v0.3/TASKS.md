# タスク分解 — v0.3

1. API 層: `marketScope` 受理ロジックと単体テスト追加。
2. フロント基盤: Tailwind 設定と共通レイアウトの置換、アクセシビリティ確認。
   - [x] App ヘッダー/メインの Tailwind リファクタ: `frontend/tests/app.snapshot.test.tsx` の期待値を Tailwind クラス前提で赤にし、`frontend/src/App.tsx` から `app__*` クラスと `MARKET_FALLBACK_NOTICE_STYLE` を除去してユーティリティクラスへ移行した上でテストを緑化する。
     - 完了理由: `frontend/src/App.tsx` で Tailwind ユーティリティクラスへ置換済み。
   - [x] SearchControls を Tailwind ベースへ置換: `frontend/src/components/__tests__/SearchControls.test.tsx` を Tailwind レイアウト検証で更新し、`frontend/src/components/SearchControls.tsx` をユーティリティクラス主体に書き換えてテストを通す。
     - 完了理由: `frontend/src/components/SearchControls.tsx` を Tailwind ユーティリティ中心に書き換え済み。
3. UI 実装: 市場切替コンポーネントとカテゴリタブのステート連携。
   - [x] CategoryTabs のモバイル縦積みレイアウト対応: `frontend/tests/category-tabs.test.tsx` に `flex-col` / `sm:flex-row` の期待を追加してテストを先に赤くし、`frontend/src/components/CategoryTabs.tsx` をモバイル縦積み＋`sm` 以上横並びの Tailwind クラスへ調整した上でテストを緑化する。
     - 完了理由: `frontend/src/components/CategoryTabs.tsx` で `flex-col` / `sm:flex-row` と `w-full` / `sm:w-auto` の Tailwind クラスを適用済みで、`frontend/tests/category-tabs.test.tsx` でも同クラスを検証している。

4. QA: React Testing Library 結合テスト更新と Playwright シナリオ作成。
   - [x] ドキュメント整備: PRD スコープ/非スコープに `GET /api/markets` を正式追加し、成功指標へ可用性 KPI を追記済み。さらに `docs/spec/v0.3/ARCHITECTURE.md` のテーマ/品質項目を現行 CI 構成と Playwright モック方針、Tailwind トークン読込へ更新した。
5. DevOps:
   - [x] CI に `npm run test:e2e` と Lighthouse スモークを追加。
     - 完了理由: `.github/workflows/ci.yml` の `frontend-e2e` ジョブが `npm run test:e2e` を実行し、`frontend-lighthouse` ジョブが Lighthouse スモーク (`lhci autorun`) を走らせている。
6. ドキュメント:
   - [x] アーキテクチャ概要の品質・テーマ項目を現行 CI / Playwright モック方針と Tailwind 移行状況に更新。
   - [x] ETL 仕様のバリデーション項目を現行の独自検証と全国平均フォールバック方針へ更新。
     - 完了理由: `docs/spec/v0.3/ETL_SPEC.md` で `validate_market_prices` による scope/価格レンジ検証とフォールバック挙動を明記した。
   - [x] ETL 仕様のバリデーション記述を `backend/app/etl/expectations.validate_market_prices` に合わせて全国平均フォールバック挙動を明記。
     - 完了理由: `docs/spec/v0.3/ETL_SPEC.md` で Great Expectations 言及を置換し、独自検証とフォールバック手順を記録した。
   - [x] テスト計画の E2E 記述を CI の push/pull_request トリガーに合わせて更新し、nightly 記述を削除。
     - 完了理由: `docs/spec/v0.3/TESTING.md` の E2E セクションを push/pull_request 実行前提の内容へ改訂済み。
   - [x] PRD CI/スタイル記述更新: `docs/spec/v0.3/PRD.md` の品質保証とアーキテクチャ指針を現行 CI ジョブと Tailwind/トークン運用へ揃えた。
   - [x] データスキーマのテーマトークン共有記述を `data/theme_tokens.json` と Tailwind 参照方式に合わせて修正。
     - 完了理由: `docs/spec/v0.3/DATA_SCHEMA.md` のカラートークン項目を `metadata_cache` 更新と静的資産共有に沿って書き換えた。
   - [x] データソース記述のカラートークン項目を `data/theme_tokens.json` 共有運用へ更新。
     - 完了理由: `docs/spec/v0.3/DATA_SOURCES.md` で seed/フロントの共通 JSON 参照に差し替え、ETL 生成記述を削除した。
   - [x] 型仕様との差分解消: `docs/spec/v0.3/TYPES.md` から `SelectedCategory` 追加記述を削除し、カテゴリ選択が `CropCategory` を共有する方針を明文化。
     - 完了理由: `docs/spec/v0.3/TYPES.md` で `SelectedCategory` 型追加の記述を除去し、`CropCategory` の横断利用を明記した。

7. ログ/監視:
   - [x] ETL 警告ログを市場メタデータ検証失敗を示す文言へ更新。
     - 完了理由: `backend/app/etl/transform.py` の警告を「市場メタデータ検証の失敗」へ統一し、Great Expectations 固有表現を除去済み。
