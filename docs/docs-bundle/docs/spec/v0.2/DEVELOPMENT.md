# 開発方針 — v0.2

## プロセス

- v0.1 と同じく GitHub Flow を採用し、PR ベースで開発。
- 仕様遵守のため PR テンプレートに検索フィルタ・トースト対応チェックを追加。

## コーディング規約

- バックエンド: Python 3.11、mypy --strict、ruff、black。
- フロントエンド: TypeScript 5.x、ESLint（recommended + react）、Prettier。

## テスト

- バックエンド: pytest、FastAPI TestClient による API テスト。
- フロントエンド: Vitest + Testing Library。E2E は Playwright を想定。

## 環境

1. Node.js 20 以上と Python 3.11 以上を準備。
2. フロントエンドを起動：

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

3. 別ターミナルでバックエンドを起動：

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt -r requirements-dev.txt
   uvicorn app.main:app --reload
   ```

4. ブラウザで表示されたローカル URL を開き、地域を選んで「今週の作付け計画」を確認。

## リリース手順

1. data/ 内の花きデータ更新を確認。
2. backend/frontend テストと E2E をパス。
3. main ブランチへマージし、ドキュメントを公開。
