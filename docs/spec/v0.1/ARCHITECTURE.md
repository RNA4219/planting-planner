# アーキテクチャ設計 - planting-planner v0.1

## 全体構成
- **Frontend (React + Vite + TypeScript)**  
  - UI 表示、操作（更新・お気に入り）、API 呼び出し
  - localStorage にお気に入りを保存し、並び替えを実現

- **Backend (FastAPI + Python)**  
  - REST API 提供 `/api/crops`, `/api/recommend`, `/api/refresh`
  - ETL バッチを実行し SQLite に価格データを保存
  - API で週ごとの推奨作物を返す

- **Database (SQLite)**  
  - 作物マスタテーブル
  - 市場価格テーブル（週次丸め）
  - 生育日数テーブル
  - お気に入りは DB には保存せずフロント側で管理

- **CI/CD (GitHub Actions)**  
  - Frontend: lint, typecheck, vitest, build  
  - Backend: ruff, black, mypy, pytest  
  - デプロイは GitHub Pages（フロント）、Render/Railway（バック）

---

## データフロー
1. ETL が公的市場データをスクレイピングまたは CSV/API から取得
2. 週単位に丸め、SQLite に UPSERT
3. Backend API が DB を参照し、逆算ロジックを実行
4. Frontend が API を呼び出し、ユーザーに「今週植えるべき作物」を表示

---

## 失敗時の挙動
- ETL が失敗した場合：前回の DB 内容を利用
- API レスポンスが欠損：`status=stale` を返す
- フロント UI は「データ更新に失敗しました」をトースト表示

---

## スケーラビリティ
- SQLite → 小規模 OSS 用の最適解
- 将来的に PostgreSQL や Supabase に移行可能（DB アクセス層を抽象化しておく）
- ETL は Airflow/Cron ベースに拡張可能
