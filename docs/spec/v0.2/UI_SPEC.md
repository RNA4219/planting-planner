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
- 更新中はボタンをスピナー付き無効状態にし、メッセージ "更新中..." を表示。
- `running` → `success` で緑のトースト、`failure` で赤、`stale` で黄色を表示。
- トーストは 5 秒後自動クローズ。手動閉鎖ボタン付き。
- `role="alert"` `aria-live="assertive"` を付与しアクセシビリティに配慮。

## Toast コンポーネント
- プロパティ: `type` (`success` `error` `warning`)、`message`、`onClose`。
- Tailwind クラスで背景色を切り替える。

## レスポンシブ
- モバイル表示では検索ボックスと更新ボタンを縦並びに。
- トーストは画面幅に応じてフル幅（<=640px）に拡張。

## ローカライゼーション
- 表示文字列は `frontend/src/constants/messages.ts` などに集約し将来の i18n に備える。
