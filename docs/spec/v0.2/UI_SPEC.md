# UI 仕様 — v0.2

## 画面構成
- ヘッダー: サイトタイトル、地域選択 `RegionSelector`、検索ボックス `SearchBox`。
- メイン列: 作物リスト `CropList`、お気に入り優先表示、更新ステータスメッセージ。
- サイド列: 選択作物の `PriceChart`、更新ボタン `RefreshButton`。
- トースト領域: 画面右上に `Toast` コンポーネントを重ねて表示。

## SearchBox
- プレースホルダ: "作物名・カテゴリで検索"。
- 入力即時でフィルタリング。`aria-label="作物検索"` を付与。
- 大文字小文字を無視、全角/半角の揺れは正規化（NFKC）。

## CropList
- フィルタ後の作物を表示。お気に入りはセクション先頭に並べる。
- マウス/キーボード操作でフォーカス可能。Enter で選択、Space でお気に入り切替。

## RefreshStatusPoller
- 更新リクエスト開始時はボタンをスピナー付き無効状態にし、メッセージ "更新中..." を表示。
- `postRefresh` が `running` を返した場合、`TOAST_MESSAGES.refreshRequestStarted` の文言（「更新を開始しました。進行状況を確認しています…」）で `info` トーストを即時に表示する。
- その後のポーリング結果は `success` で緑、`failure` で赤、`stale` で黄色のトーストに集約し、完了後に `onSuccess` をトリガーする。
- トーストは 5 秒後に自動クローズし、各トーストに閉じるボタンを必ず設置する。
- `role="alert"` `aria-live="assertive"` 属性を付与し、支援技術へ確実に通知する。

## Toast コンポーネント
- プロパティ: `variant` (`success` `error` `warning` `info`)、`message`、`detail?`、`onDismiss?`。
- DOM 構造は `toast-stack` ブロック配下に `toast toast--<variant>` という BEM 風クラスでバリアント別スタイルを切り替える。
- `autoCloseDurationMs` 既定値は 5,000ms（`TOAST_AUTO_DISMISS_MS`）で、手動操作時もタイマーを停止する。

## レスポンシブ
- モバイル表示では検索ボックスと更新ボタンを縦並びに。
- トーストは画面幅に応じてフル幅（<=640px）に拡張。

## ローカライゼーション
- 表示文字列は `frontend/src/constants/messages.ts` などに集約し将来の i18n に備える。
