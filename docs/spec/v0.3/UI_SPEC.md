# UI 仕様 — v0.3

- 市場切替: ヘッダー右上に `Select` コンポーネントを配置し、`national` と `city:*` を Tailwind
  `bg-market-*` で色分け。未選択時は全国。
- カテゴリタブ: 上部水平タブで `aria-selected` 管理。`sm` 未満は縦積みカード、`md` 以上はタブと
  グリッドの組み合わせ。選択カテゴリのみリスト表示。
- 推薦カード: Tailwind コンポーネント化 (`card-market`) し、市場切替時に価格バッジをフェード
  更新。Skeleton も Tailwind `animate-pulse` を使用。
- トースト: `ToastStack` コンポーネントで取得系トーストと市場フォールバック警告を積み上げ表示
  する。フォールバック検出時は `warning` variant で
  `TOAST_MESSAGES.recommendationFallbackWarning` を enqueue する。
  `aria-live="polite"` と `role="status"` を維持。
