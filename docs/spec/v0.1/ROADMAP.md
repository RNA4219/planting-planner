# ロードマップ - planting-planner v0.1

## Day 1〜3: MVP開発
- [x] リポジトリ初期化（README, License, .gitignore）
- [x] CI 構築（Frontend/Backend lint, test, build）
- [x] Frontend 雛形 (React+TS+Vite)
- [x] Backend 雛形 (FastAPI+SQLite)
- [x] 作物マスタ/生育日数のシードデータ投入
- [x] API `/crops`, `/recommend`, `/health` 実装
- [x] フロントUI（リスト表示・☆お気に入り）
- [x] 更新ボタン → `/refresh` API 呼び出し
- [ ] MVP版公開（Pages/Render）

---

## v0.2: 実用化拡張
- 花きデータ取り込み追加
- `/refresh/status` 実装 & トースト通知
- 欠損データ処理（過去平均補完）
- API `/price` 実装（価格履歴表示）
- Backend ユニットテスト充実
- UI 検索フィルタ追加

---

## v0.3: ユーザビリティ強化
- 市場別切替（全国平均 ↔ 都市別）
- カテゴリ別タブ（葉菜/根菜/花き）
- UI デザイン改善（Tailwind対応）
- E2Eテスト導入（Playwright）

---

## v0.4 以降: 将来計画
- Supabase/PostgreSQL 移行オプション
- Docker Compose 化
- 国際化（i18n, 英語UI）
- 外部農業API（天候データ）との統合
- スマホ対応（必要があれば検討）

---

## 優先順位
- 短期: **MVP完成と公開**
- 中期: **花き対応と更新ジョブ安定化**
- 長期: **DB移行や国際化**
