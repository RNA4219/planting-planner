# テスト戦略 - planting-planner v0.1

## 対象範囲
- **Backend (FastAPI)**
  - 単体テスト: API レスポンス（/api/health, /api/crops, /api/recommend, /api/refresh, /api/refresh/status, /api/price）
    - 価格 API は不正な週指定時に 400 を返すバリデーションも含めて検証
  - 結合テスト: ETL 実行 → DB 更新 → API 返却の一連動作
  - 静的解析: ruff, black, mypy

- **Frontend (React + Vite + TS)**
  - ユニットテスト: コンポーネントレンダリング、localStorage お気に入り保存
  - スナップショットテスト: UI レイアウト
  - 静的解析: eslint, tsc

- **E2E (将来拡張)**
  - Playwright または Cypress
  - 「更新 → 作物リスト表示 → お気に入り登録」の一連動作を検証

---

## 実行方法

### Backend
```bash
cd backend
pytest -q
ruff check .
black --check .
mypy app
```

### Frontend

```bash
cd frontend
npm run lint
npm run typecheck
npm test
```

---

## CI

* GitHub Actions による自動実行
* PR 作成時に lint/typecheck/test が走る
* main ブランチへの push では必須チェック

---

## カバレッジ

* 初期段階では 70% 以上を目標
* 将来的に CI に coverage レポートを組み込み、バッジ表示

---

## 非機能テスト

* DB 破損やデータ欠損時のフォールバックを確認
* フロントの localStorage 永続性を検証
