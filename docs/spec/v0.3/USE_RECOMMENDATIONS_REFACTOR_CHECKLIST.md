# useRecommendations リファクタ進捗チェックリスト

## 完了条件

- [ ] ローダーテストを `frontend/tests/hooks/useRecommendations` 配下へ移設し、共通ヘルパー
  経由で参照する。
- [ ] コントローラーテストを `frontend/tests/hooks/useRecommendations` 配下へ移設し、共通
  ヘルパー経由で参照する。
- [ ] `frontend/src/hooks/useRecommendations.test.ts` を 300 行未満かつ
  `useRecommendations` 専用の内容へ整理する。
- [ ] `frontend/tests/hooks/useRecommendations/helpers.ts` でモック/fixture を一元管理する。

## メモ

- テスト移設はヘルパーの導入に合わせて段階的に実施する。
- 旧ファイルからの移植時は API 互換性とモックの副作用範囲を必ず確認する。
