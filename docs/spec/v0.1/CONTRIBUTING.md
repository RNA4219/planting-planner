# Contributing Guide - planting-planner v0.1

## コントリビューションの流れ
1. Issue を立てる（バグ報告 / 機能提案）
2. main ブランチからトピックブランチを切る
3. 実装 → テスト → Lint/Typecheck 通過を確認
4. Pull Request を作成
5. CI がグリーンであることを確認
6. レビュー後、Squash & Merge

---

## コードスタイル
- **Backend (Python)**
  - ruff + black + mypy で統一
- **Frontend (TS/React)**
  - eslint + prettier + tsc で統一

---

## コミットメッセージ規約
- [Conventional Commits](https://www.conventionalcommits.org/) に準拠
- 例: `feat: add refresh endpoint`, `fix: correct DB schema`, `docs: update spec`

---

## ブランチ命名
- 機能追加: `feat/<short-name>`
- バグ修正: `fix/<short-name>`
- ドキュメント: `docs/<short-name>`

---

## テスト
- すべての PR はテストを追加 or 更新すること
- `pytest -q` / `npm test` がグリーンであることを確認

---

## ライセンス
- MIT License の下で OSS として公開
- 提供されたコードはライセンスに従って公開される
