<!-- markdownlint-configure-file { "MD013": false } -->

# プロダクト要件定義（PRD） — v0.3

## 概要

v0.3 は既存の栽培計画支援を拡張し、市場視点の切替とカテゴリ別
ナビゲーションを導入して比較検討を容易にする。UI を Tailwind CSS へ
刷新し、将来のコンポーネント拡張とアクセシビリティ向上の基盤を
整える。さらに Playwright による E2E テストを追加し、主要導線の品質を
自動検証する。

## 目的

- 全国平均と都市別市場価格の比較をワンタップで実現する。
- 葉菜・根菜・花きカテゴリで作物情報を整理し、探索性を高める。
- Tailwind ベースのデザイン指針へ移行し、統一されたレスポンシブ
  スタイリングを確保する。
- 市場切替・カテゴリ切替・推薦閲覧の主要フローを E2E テストで守る。

## スコープ

- バックエンド: 市場クエリ（national, city）を受け取り既存レスポンス構造
  を維持する。都市別データは既存 ETL で取得済みの `market_prices` を都市
  キーで参照する。市場メタデータ API として `GET /api/markets` を追加し、
  `market_metadata` キャッシュを JSON で公開する。
- フロントエンド: 市場切替トグルとカテゴリタブ UI を追加し、Tailwind
  コンポーネントへ置換する。状態管理は既存 store を拡張し、副作用は
  actions 内へ限定する。
- データ/ETL: 都市一覧メタデータの保守と欠損時フォールバック（全国平均）
  を行う。既存スキーマは変更しない。
- 品質保証: GitHub Actions CI は `push` と `pull_request` で次の
  ジョブを並列実行する: `frontend` `frontend e2e (playwright)`
  `backend-lint` `backend-test` `frontend-lighthouse`。Playwright 成果の
  集計スクリプトでは `python backend/app/ci/playwright_metrics.py --job-name
  "frontend e2e (playwright)" ...` のように `--job-name` を指定し、CI 記録と
  整合させる。

## 非スコープ

- `GET /api/markets` 以外の新規 API エンドポイント追加。
- ユーザー定義都市を登録する UI。
- Tailwind プラグインによる高度なテーマカスタマイズ。

## 成功指標

- 市場切替操作後 300ms 以内にリストが再描画される（Lighthouse 測定）。
- カテゴリタブ切替でユーザーが 3 クリック以内に目的作物へ到達する
  （ユーザビリティテスト）。
- Playwright シナリオが main ブランチで連続 5 回成功する。
- `GET /api/markets` の 5xx 率を 1% 未満に維持し、キャッシュ欠損時は 2 分
  以内に復旧する。

## UI/UX 指針

- グローバルヘッダー右上に市場切替セレクタ（トグル or セレクト）を配置
  し、初期値を「全国平均」とする。
- カテゴリタブは上部水平タブとし、選択状態を Tailwind の
  `aria-selected` ユーティリティで表現する。
- ブレークポイントは `sm` で縦積み、`md` 以上で横並びとし、Tailwind の
  カスタムカラー `theme.colors.market.*` を利用する。
- 市場未選択時は全国平均を表示し、都市データ欠損はトーストで通知する。

## アーキテクチャ指針

- API リクエストに `marketScope` パラメータを追加し、`national` を
  デフォルト、都市は `city:<city_id>` とする。既存レスポンス JSON は変更
  しない。
- カテゴリタブは `CropCategory` 列挙を再利用し、store に
  `selectedCategory` を追加して既存 selectors を拡張する。
- Tailwind 設定は `frontend/tailwind.config.ts` を更新し、コンポーネントは
  Tailwind ユーティリティと `theme.colors.market.*` などのテーマトークンへ
  移行する。
- Playwright セットアップは `frontend/tests/e2e` に配置し、`npm run
  test:e2e` を追加する。CI は Playwright のデフォルトワーカー数で実行し、
  固定 1 に制限しない。固定並列数へ戻す場合は flake 率や実行時間の悪化を
  評価し、必要最小限のシナリオ抽出後に適用する。

## テスト計画

- 単体テスト: 市場スコープ引数追加による API ハンドラの分岐を検証する。
- 結合テスト: フロントエンドで市場切替からレンダリングまでの一連を
  React Testing Library で確認する。
- E2E テスト: Playwright で次を自動化する。
  - 市場切替で価格表示が都市値へ更新される。
  - カテゴリタブ変更で該当作物のみ表示される。
  - 推薦カードの Tailwind クラス存在とリンク遷移を確認する。

## リスクと緩和策

- Tailwind 置換で既存スタイルが崩れる可能性 → Storybook の Visual
  Regression をスポット実行する。
- 都市別データ不足の懸念 → バックエンドで全国平均へのフォールバックと
  アラート通知を行う。
- Playwright 実行時間の増加 → smoke シナリオの最小化と並列化準備で緩和
  する。

## マイルストーン

1. 市場データ API を拡張し、バックエンドを 1 スプリントで完了する。
2. Tailwind 基盤を導入し、主要コンポーネントを 1.5 スプリントで
   リファクタする。
3. カテゴリタブと市場切替 UI を 1 スプリントで実装する。
4. Playwright を導入し、QA とフロントエンドで 0.5 スプリントかけて CI へ
   統合する。
