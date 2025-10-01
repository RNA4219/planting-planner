# 開発手順 - planting-planner v0.1

## 前提
- Node.js v20+
- Python 3.11+
- SQLite 3

---

## セットアップ

### フロントエンド
```bash
cd frontend
npm ci
npm run dev
```

### バックエンド

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload
```

---

## 環境変数

* `.env` ファイルを backend に置く（必須ではないが拡張用）
* `DATABASE_URL=sqlite:///./planting.db`

---

## 開発ルール

* コードスタイル:

  * Frontend: ESLint + Prettier
  * Backend: ruff + black + mypy
* コミット規約: [Conventional Commits](https://www.conventionalcommits.org/)
* CI: GitHub Actions で lint/typecheck/test が走る

---

## ディレクトリ構成（初期）

```
frontend/   # React+Vite
backend/    # FastAPI
docs/       # 仕様書
data/       # 初期シードデータ
```

---

## デプロイ

* フロントエンド: GitHub Pages または Vercel
* バックエンド: Render または Railway
* DB: SQLite ファイルを同梱（小規模運用前提）

---

## 将来拡張

* Dockerfile を追加し、Compose で front+back を統合
* Supabase/PostgreSQL への移行を可能にする抽象化
