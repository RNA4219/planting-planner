# アクセシビリティ監査メモ v0.3: カテゴリタブと推奨テーブル

## 対象コンポーネント

- `CategoryTabs`
- `RecommendationsTable`
- `App` における両者の連携

## 課題概要

カテゴリタブと推奨テーブル間の関連付けが無く、スクリーンリーダーがタブ操作後に適切なタブパネルへ移動できなかった。

## 是正内容

- 各タブへ安定した `id="category-tab-<カテゴリキー>"` と `aria-controls` を付与。
- 推奨テーブルを `role="tabpanel"` として公開し、`aria-labelledby` でアクティブタブと接続。
- `App` からタブパネルIDを共有して、タブとテーブルが同一IDを参照するよう統合。

## テスト手順

1. `cd frontend`
2. `npm run test -- --run tests/accessibility/categoryTabs.a11y.test.tsx`

   - Vitest の単体ファイルは `npm run test -- --run <テストファイルパス>` で指定できる。

3. `tests/accessibility/categoryTabs.a11y.test.tsx` が成功し、アクティブタブとタブパネルのARIA属性が期待通りであることを確認する。
