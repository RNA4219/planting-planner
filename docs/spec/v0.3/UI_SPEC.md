# UI 仕様 — v0.3

- 市場切替: ヘッダー右上に `Select` コンポーネントを配置し、`national` と `city:*` を Tailwind `bg-market-*` で色分け。未選択時は全国。
- カテゴリタブ: 上部水平タブで `aria-selected` 管理。`sm` 未満は縦積みカード、`md` 以上はタブ+グリッド。選択カテゴリのみリスト表示。
- 推薦カード: Tailwind コンポーネント化 (`card-market`) し、市場切替時に価格バッジをフェード更新。Skeleton も Tailwind `animate-pulse` 使用。
- トースト: 都市データ欠損時に `toast.warn` を表示し、`aria-live="polite"` としてアクセシビリティを担保。
