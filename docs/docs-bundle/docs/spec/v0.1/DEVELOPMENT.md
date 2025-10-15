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
* `PLANTING_DB_PATH=/abs/path/to/planting.db`
  * FastAPI バックエンドが参照する SQLite ファイルへの絶対パスを指定する。
  * 上記の例は SQLite ファイルを想定したパスであり、他の RDBMS を使用する場合は別途ドライバ設定を行う。
  * 旧 `DATABASE_URL` は使用しない（互換用に残す場合は、同一 SQLite ファイルを指すように設定する）。

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
