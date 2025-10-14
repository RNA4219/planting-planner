# タスク分解 — v0.3

1. API 層: `marketScope` 受理ロジックと単体テスト追加。
   - [x] MarketScopeQuery の入力正規化と市場別フォールバック検証を完了する。
     - 完了理由: `backend/app/dependencies.py` の `_market_scope_query` / `MarketScopeQuery` が `national`→デフォルト化、空文字・`all` 無視、`city:<id>` を `schemas.parse_market_scope` で検証し 422 を返す実装になっており、`backend/tests/test_recommend.py` のパラメタイズ検証・都市価格優先・フォールバックヘッダー網羅テストで全市場スコープ分岐をカバーしている。
2. フロント基盤: Tailwind 設定と共通レイアウトの置換、アクセシビリティ確認。
   - [x] App ヘッダー/メインの Tailwind リファクタ: `frontend/tests/app.snapshot.test.tsx` の期待値を Tailwind クラス前提で赤にし、`frontend/src/App.tsx` から `app__*` クラスと `MARKET_FALLBACK_NOTICE_STYLE` を除去してユーティリティクラスへ移行した上でテストを緑化する。
     - 完了理由: `frontend/src/App.tsx` で Tailwind ユーティリティクラスへ置換済み。
   - [x] SearchControls を Tailwind ベースへ置換: `frontend/src/components/__tests__/SearchControls.test.tsx` を Tailwind レイアウト検証で更新し、`frontend/src/components/SearchControls.tsx` をユーティリティクラス主体に書き換えてテストを通す。
     - 完了理由: `frontend/src/components/SearchControls.tsx` を Tailwind ユーティリティ中心に書き換え済み。
3. UI 実装: 市場切替コンポーネントとカテゴリタブのステート連携。
   - [x] CategoryTabs のモバイル縦積みレイアウト対応: `frontend/tests/category-tabs.test.tsx` に `flex-col` / `sm:flex-row` の期待を追加してテストを先に赤くし、`frontend/src/components/CategoryTabs.tsx` をモバイル縦積み＋`sm` 以上横並びの Tailwind クラスへ調整した上でテストを緑化する。
     - 完了理由: `frontend/src/components/CategoryTabs.tsx` で `flex-col` / `sm:flex-row` と `w-full` / `sm:w-auto` の Tailwind クラスを適用済みで、`frontend/tests/category-tabs.test.tsx` でも同クラスを検証している。
   - [ ] カテゴリタブを市場メタデータのカテゴリ順へ同期: `frontend/src/components/CategoryTabs.tsx` と `frontend/src/hooks/recommendations/__tests__/store.test.ts` を対象に、市場 API の `categories` 配列を読み込むフックを先にテストで固定化し、UI が選択市場変更でタブ順を更新することを TDD で実装する。
   - [x] App.tsx 分割リファクタ: `AppContent` をプレゼンテーション層コンポーネントと状態管理フックへ切り出し、既存結合テストが新構成でも通るように段階移行する。
     - 完了理由: `frontend/src/App.tsx` が `frontend/src/app/AppScreen.tsx` と `frontend/src/app/useCategoryTabs.ts` へ責務分離され、AppScreen が表示・通知処理を担い、useCategoryTabs フックがカテゴリタブ状態を連携している。進行証跡: `frontend/src/app/AppScreen.tsx` および関連フック実装で分割後の構成を確認できる。

4. QA: React Testing Library 結合テスト更新と Playwright シナリオ作成。
   - [x] ドキュメント整備: PRD スコープ/非スコープに `GET /api/markets` を正式追加し、成功指標へ可用性 KPI を追記済み。さらに `docs/spec/v0.3/ARCHITECTURE.md` のテーマ/品質項目を現行 CI 構成と Playwright モック方針、Tailwind トークン読込へ更新した。
   - [ ] Playwright フレーク監視ダッシュボード整備: [週4計画](./ROADMAP.md) に沿って CI 成果のメトリクス収集を自動化し、`frontend e2e (playwright)` ジョブで最新成功率を可視化する。
    - CLI 実行例では `python backend/app/ci/playwright_metrics.py --job-name "frontend e2e (playwright)" ...` のように `--job-name` を `backend/app/ci/playwright_metrics.py` の `DEFAULT_JOB_NAME` と一致させる。
    - 完了条件: CI 実行履歴から flake 率を集計するスクリプトまたはダッシュボードが作成され、`frontend e2e (playwright)` の失敗理由が 1 画面で追跡できること。
   - [x] Playwright クリティカルパス拡充: [週4計画](./ROADMAP.md) の E2E 安定化に合わせて、結帳・カテゴリ切替のシナリオを `frontend/tests/e2e` 配下へ追加し、`npm run test:e2e` を緑化する。
     - 完了理由: `frontend/tests/e2e/checkout-flow.spec.ts` を追加し、`npm run test:e2e` が緑化したことを確認した。
     - 完了条件: 新規シナリオが CI 上で安定動作し、クリティカルパスで未検知だったバグ再現ケースに対する回帰テストが追加されていること。
5. DevOps:
   - [x] CI に `npm run test:e2e` と Lighthouse スモークを追加。
     - 完了理由: `.github/workflows/ci.yml` の `frontend-e2e` ジョブが `npm run test:e2e` を実行し、`frontend-lighthouse` ジョブが Lighthouse スモーク (`lhci autorun`) を走らせている。
6. ドキュメント:
   - [x] アーキテクチャ概要の品質・テーマ項目を現行 CI / Playwright モック方針と Tailwind 移行状況に更新。
   - [x] ETL 仕様のバリデーション項目を現行の独自検証と全国平均フォールバック方針へ更新。
     - 完了理由: `docs/spec/v0.3/ETL_SPEC.md` で `validate_market_prices` による scope/価格レンジ検証とフォールバック挙動を明記した。
   - [x] ETL 仕様のバリデーション記述を `backend/app/etl/expectations.validate_market_prices` に合わせて全国平均フォールバック挙動を明記。
     - 完了理由: `docs/spec/v0.3/ETL_SPEC.md` で Great Expectations 言及を置換し、独自検証とフォールバック手順を記録した。
   - [x] ETL 仕様のカテゴリ整備項目を `_resolve_categories` の動的復元方針へ更新し、参照実装を `backend/app/etl/transform.py` に明記。
     - 完了理由: `docs/spec/v0.3/ETL_SPEC.md` に `backend/app/etl/transform.py` の `_resolve_categories` が `market_prices` と `crops` の最新スナップショットからカテゴリを動的に再構築する方針を追記した。
   - [x] テスト計画の E2E 記述を CI の push/pull_request トリガーに合わせて更新し、nightly 記述を削除。
     - 完了理由: `docs/spec/v0.3/TESTING.md` の E2E セクションを push/pull_request 実行前提の内容へ改訂済み。
   - [x] PRD CI/スタイル記述更新: `docs/spec/v0.3/PRD.md` の品質保証とアーキテクチャ指針を現行 CI ジョブと Tailwind/トークン運用へ揃えた。
   - [x] 型仕様のストア記述を現行 Zustand 実装へ更新: `docs/spec/v0.3/TYPES.md` から Redux 記述を削除し、`frontend/src/hooks/recommendations/store.ts` の Zustand ストアで `selectedMarket` / `selectedCategory` を保持する方針を明示。
     - 完了理由: `docs/spec/v0.3/TYPES.md` に Redux 非採用と Zustand ストアの状態キー（`selectedMarket` / `selectedCategory`）を記載し、参照元として `frontend/src/hooks/recommendations/store.ts` を明記した。
   - [x] PRD Playwright 並列実行記述更新: `docs/spec/v0.3/PRD.md` の CI 設定を Playwright デフォルトワーカー数準拠へ修正し、固定並列数検討時の留意点を追加。
     - 完了理由: `docs/spec/v0.3/PRD.md` で CI 並列数をデフォルトワーカー準拠と明記し、固定 1 へ戻す場合は flake 率悪化や CI 時間増を評価するメモを追記した。
     - 検討事項: 並列数を固定する場合は CI インフラ制限とシナリオ分割可否を確認し、スロットリングで代替できるかを先に検証する。
   - [x] データスキーマのテーマトークン共有記述を `data/theme_tokens.json` と Tailwind 参照方式に合わせて修正。
     - 完了理由: `docs/spec/v0.3/DATA_SCHEMA.md` のカラートークン項目を `metadata_cache` 更新と静的資産共有に沿って書き換えた。
   - [x] データソース記述のカラートークン項目を `data/theme_tokens.json` 共有運用へ更新。
     - 完了理由: `docs/spec/v0.3/DATA_SOURCES.md` で seed/フロントの共通 JSON 参照に差し替え、ETL 生成記述を削除した。
   - [x] 開発運用監視に backend lint 拡充を追記: `docs/spec/v0.3/DEVELOPMENT.md` の監視セクションへ `ruff check .` / `black --check .` を追加し、CI トリガーと同期させる。
     - 完了理由: `.github/workflows/ci.yml` の `backend-lint` ジョブが `push` / `pull_request` で `ruff check .` / `black --check .` を実行しているため、監視対象へ明記して齟齬を防止。
   - [x] 開発運用監視に frontend typecheck を追記: `docs/spec/v0.3/DEVELOPMENT.md` の監視セクションへ `npm run typecheck` を追加し、CI の pre-merge チェックと整合させる。
     - 完了理由: `.github/workflows/ci.yml` の `frontend-verify` 系ジョブで `npm run typecheck` を実行しており、監視項目への追記でドキュメントと実運用の差分を解消した。
   - [x] 開発運用監視の typecheck 手順を `cd frontend && npm run typecheck` へ更新。
     - 完了理由: ルート直下からの `npm run typecheck` 実行では frontend パッケージが参照できないため、監視手順をディレクトリ移動込みで明示した。
   - [x] 開発運用監視に frontend build 検証を追記。
     - 完了理由: `.github/workflows/ci.yml` の `frontend` ジョブで `npm run build` が必須のため、監視対象へ `cd frontend && npm run build` を追加してローカル検証と CI の手順差異を解消した。
   - [x] 開発運用監視の lint/test/e2e 手順を `cd frontend && …` へ統一。
     - 完了理由: ルート直下で `npm run lint` / `npm run test` / `npm run test:e2e` を実行すると frontend パッケージを解決できず失敗するため、`cd frontend &&` を明示して再現性を確保した。
   - [x] PRD 品質保証セクションの Playwright ジョブ表示名と CLI `--job-name` 記述を更新。
     - 完了理由: `docs/spec/v0.3/PRD.md` で `frontend e2e (playwright)` への改称と `python backend/app/ci/playwright_metrics.py --job-name "frontend e2e (playwright)"` の記載を追加し、CI 表記と CLI ガイドを同期させた。
   - [x] コントリビューション指針に frontend build 手順を追加: `docs/spec/v0.3/CONTRIBUTING.md` のチェックリストへ `cd frontend && npm run build` を追記し、CI の `frontend` ジョブと整合させる。
     - 完了理由: `.github/workflows/ci.yml` の `frontend` ジョブで `npm run build` を実行しており、ローカル検証と CI 要件の差分をなくすため。
   - [x] データスキーマのカテゴリフォールバック説明を `market_scope_categories` と `_resolve_categories` の動的生成方針へ更新。
     - 完了理由: `docs/spec/v0.3/DATA_SCHEMA.md` で `market_scope_categories` 優先と `_resolve_categories` によるスコープ別カテゴリ補完を記述した。
   - [x] カテゴリ再構築仕様を `_resolve_categories` の `market_prices` / `crops` JOIN ロジックへ合わせて追記。
     - 完了理由: `docs/spec/v0.3/DATA_SCHEMA.md` に `_resolve_categories` が `market_prices` からカテゴリコードを抽出し `crops` で正規化する再構築手順を明記した。
   - [x] コントリビューション指針に CI と整合するフロントエンド検証手順 (`npm run typecheck` 含む) を追記。
     - 完了理由: `.github/workflows/ci.yml` のジョブ構成に合わせて `docs/spec/v0.3/CONTRIBUTING.md` へ `cd frontend && npm run typecheck` などの実行手順を明記した。
   - [x] コントリビューション指針のバックエンド lint 手順を CI と同期。
     - 完了理由: `.github/workflows/ci.yml` の `backend-lint` ジョブに合わせて `docs/spec/v0.3/CONTRIBUTING.md` へ `cd backend && ruff check .` / `cd backend && black --check .` の実行手順を追記し、必須チェックが揃ったことを記録した。
   - [x] コントリビューション指針の検証コマンド順序を CI と同期 (`npm run build` 含む)。
     - 完了理由: `.github/workflows/ci.yml` の `frontend`→`frontend-e2e`→`backend-lint`→`backend-test` の順序に合わせ、`docs/spec/v0.3/CONTRIBUTING.md` で `npm run build` を含むコマンド群を並べ替えた。
   - [x] 開発運用ドキュメントの監視方針を push/pull_request 実行へ更新。
     - 完了理由: `docs/spec/v0.3/DEVELOPMENT.md` の監視セクションで `pytest` / `mypy` を `push` / `pull_request` トリガーへ置き換え、nightly 記述を削除した。
   - [x] API リファレンス `/api/recommend` フォールバックヘッダー追記。
     - ヘッダー検証観点: 市場欠損フォールバックは 200 応答となるため、`fallback: true` と `access-control-expose-headers: fallback` の両方を確認して UI 側の警告や再計算抑止を行う。
   - [x] API リファレンス `/api/recommend` フォールバック露出条件追記。
     - 検証観点: 通常応答では `fallback: true` ヘッダーが付与されないことを確認し、フォールバック時のみ `fallback: true` が追加される。`access-control-expose-headers: fallback` は常時存在するため、`fallback: true` の有無でフォールバックを判断する。
   - [x] API リファレンス `/api/recommend` `/api/price` のフォールバックヘッダー記述を更新。
     - 検証観点: 全応答で `access-control-expose-headers: fallback` が露出し、`fallback: true` ヘッダーの有無でフォールバック判定すること。
   - [x] API リファレンス `/api/markets` に `timezone`・`priority`・`effective_from`・`categories` の説明とサンプル JSON を追記。
     - 完了理由: `docs/spec/v0.3/API_REFERENCE.md` に市場メタデータの追加フィールドを記述し、ETL の `_refresh_market_metadata_cache` で生成される構造と一致させた。
   - [x] Docs トップのリンクとバージョン表記を v0.3 に更新。
     - 完了理由: `docs/index.md` の参照先を `docs/spec/v0.3/` 配下へ差し替え、表記を `Docs version: v0.3` に揃えた。
   - [x] README の現行パスを v0.3 へ更新し、運用ルール変更がないことを確認。
     - 完了理由: `docs/spec/README.md` の最新版リンクを `v0.3` に差し替え、仕様ルールの差分が不要であることを確認した。
7. リリース準備:
   - [x] QA サインオフ資料整備: [週5計画](./ROADMAP.md) に合わせて Go/No-Go 判定項目と最新 KPI を `docs/spec/v0.3/RELEASE_CHECKLIST.md` へ追記する。
     - 完了条件: KPI・残課題・ロールバック手順がチェックリスト化され、週次レビューで承認済みであること。
     - 完了理由: `docs/spec/v0.3/RELEASE_CHECKLIST.md` で KPI・未解決課題・ロールバック手順を網羅したチェックリストを整備済み。
   - [x] UI 仕様のトースト記述を `ToastStack` と市場フォールバック警告の現仕様へ更新。
     - 検証観点: フォールバック検出時に `warning` variant を enqueue → ToastStack の `role="status"` / auto dismiss と手動 dismiss が両立すること。
   - [x] 型仕様との差分解消: `docs/spec/v0.3/TYPES.md` から `SelectedCategory` 追加記述を削除し、カテゴリ選択が `CropCategory` を共有する方針を明文化。
     - 完了理由: `docs/spec/v0.3/TYPES.md` で `SelectedCategory` 型追加の記述を除去し、`CropCategory` の横断利用を明記した。

8. ログ/監視:
   - [x] ETL 警告ログを市場メタデータ検証失敗を示す文言へ更新。
     - 完了理由: `backend/app/etl/transform.py` の警告を「市場メタデータ検証の失敗」へ統一し、Great Expectations 固有表現を除去済み。
