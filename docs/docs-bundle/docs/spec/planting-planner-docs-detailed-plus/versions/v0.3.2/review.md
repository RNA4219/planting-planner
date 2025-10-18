# v0.3.2 レビュー確認・実装項目

## リスク / 改善余地

### 依存管理の一貫性
- [ ] `pyproject.toml` / `poetry.lock` を単一ソースとし、`README.md` のセットアップ手順を Poetry ベースへ更新する。
- [ ] `poetry export --without-hashes -f requirements.txt -o requirements.txt` の自動生成手順を `scripts/` か CI に組み込み、`requirements*.txt` と乖離しないようチェックを追加する。

### ドキュメント→ワークフローの追随性
- [ ] `README.md` から `/.github/workflows/*.yml` への直リンクを追加し、Playwright / Lighthouse の設定位置を明示する。
- [ ] CI 失敗時のアーティファクト保存先（例: `Actions → Summary → Artifacts`）を README にリンク付きで記載する。

### PWA 周りの最終チェック
- [ ] `frontend/public/manifest.json` の `icons`（`purpose: ["any", "maskable"]`）、`start_url`、`display`、`scope` を Lighthouse の PWA 監査で確認する。
- [ ] `frontend/src/main.tsx` の Service Worker 登録と `frontend/public/index.html` の `<link rel="manifest">` を突き合わせ、インストール可能判定が得られることを確認する。
- [ ] `npm run build && npm run preview` 後に Lighthouse PWA スコア 80 以上を CI またはローカルで記録し、README にスコア取得手順を追記する。

### データの再現性とバージョニング
- [ ] `docs/data.md`（新規作成）へ e-Stat / MAFF 由来 ETL レシピ、ソース URL、取得日時、加工スクリプトを一覧化する。
- [ ] `/data/seed-<yyyymmdd>.db` の命名規約、差分ログ、更新頻度をドキュメント化し、生成スクリプト（例: `scripts/export_seed.py`）にバージョンメタデータを埋め込む。

### パフォーマンス / 回線耐性
- [ ] 週次データ API の HTTP キャッシュ制御（`Cache-Control`, `ETag`）と Service Worker キャッシュ戦略（`api-get-cache`）の整合を設計書へ反映する。
- [ ] 検索結果リストの仮想スクロール（例: `react-window`）導入方針とメモ化戦略（`useMemo`/`React.Query` のキャッシュキー）をタスク化し、ベンチマーク手順を用意する。

### 型・静的検査の見える化
- [ ] BE: `ruff`, `mypy`, `pytest --cov` を GitHub Actions に追加し、カバレッジ閾値 80% 以上で Fail Fast にする。
- [ ] FE: `tsc --noEmit` と `eslint --max-warnings=0` を CI に統合し、`README.md` へコマンド名とワークフローへのリンクを追記する。

### 地域性・週番号の厳密さ
- [ ] 日本の週起点（農林水産省指針）と祝日処理の出典 URL を docs に追記し、境界地域（寒冷地/温暖地/暖地）の説明を加える。
- [ ] 週番号ロジック（`backend/app/utils/week_number.py` 等）のユニットテストを拡充し、境界日（年末週・祝日跨ぎ）で期待値を保証する。

## 1.0 ゲート（提案チェックリスト）
- [ ] 依存統一：Poetry か pip のどちらかに統一し、もう一方は `poetry export` 等の自動生成に限定する。
- [ ] CI 可視リンク：`/.github/workflows/*.yml` を README から参照可能にし、アーティファクト保存先を明文化する。
- [ ] PWA 完全化：manifest + Service Worker を整備し、Lighthouse PWA スコア 80 以上を確認する。
- [ ] データ再現性：ETL レシピ、スナップショット命名規約、変更履歴、更新頻度を `docs/data.md` に集約する。
- [ ] 静的解析とカバレッジ閾値：BE/FE とも CI で失敗時即検知する設定にする。
- [ ] アクセシビリティ：キーボード操作、コントラスト、トーストのライブリージョンを最終点検し、結果を README の QA セクションに反映する。

## 追加の小粒 Issue
- [ ] `perf(frontend)`: フィルタ結果のメモ化と長リストの仮想化対応案を issue 化する。
- [ ] `docs(data)`: 生育日数の出典一覧と更新手順を docs に追加する。
- [ ] `ci`: `ruff` / `mypy` と `pytest --cov` の導入、閾値設定を issue として管理する。
- [ ] `pwa`: manifest / Service Worker / Lighthouse PWA スコアの継続監視タスクを追加する。
- [ ] `export`: 週次計画の ICS / CSV エクスポート機能を検討する issue を起票する。
