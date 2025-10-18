![ci](https://github.com/R-N-A/planting-planner/actions/workflows/ci.yml/badge.svg)

# Planting Planner

趣味農家・家庭菜園向けに、収穫したい週から逆算して「今週植える作物」を提案するオープンソースの作付けナビです。

## このプロジェクトでできること
- 収穫予定週を基点に、寒冷地/温暖地/暖地ごとの播種・定植タイミングを逆算して一覧化。
- 直感的なPC向け画面で、お気に入りの作物を☆マークで保存し並び替え。
- 「更新」ボタンひとつで最新データを取得し、週次のおすすめ作物をチェック。

## ローカルで試す
1. Node.js 20 以上、Python 3.11 以上、Poetry 1.6 以上を準備します。
2. 依存関係をまとめてインストールします。
   ```bash
   poetry install --with backend,dev
   ```
3. バックエンド API を起動します。
   ```bash
   poetry run uvicorn backend.app.main:app --reload
   ```
4. 別ターミナルでフロントエンドを起動します。
   ```bash
   cd frontend
   npm ci
   npm run dev
   ```
5. 表示されたローカル URL を開き、地域を選んで「今週の作付け計画」を確認します。

> 💡 SQLite の既存データを使うので、基本設定のままでお試しできます。ETL を走らせる場合は `data/` ディレクトリや `/api/refresh` をご覧ください。

## データの出どころ
- e-Stat を中心とした公的統計データから週次の市場動向を取得。
- 農林水産省の公開資料をもとに平均的な生育日数を整理。
- 作物マスタや生育データを SQLite に蓄えて API から配信します。

## ご利用前に
- 本ツールが示す時期はあくまで一般的な目安であり、地域差や天候は加味されません。
- 利用による損害は開発者が負わない点をご理解のうえご活用ください。
- PCブラウザ・路地栽培前提のアプリです。温室栽培やスマホ利用は対象外です。

## ドキュメントと参加のしかた
- プロダクト仕様やAPI設計など、詳細資料は `/docs` フォルダに集約しています。
- バグ報告や改善提案は Issue/PR で歓迎です。開発フローやスタイルは Docs の CONTRIBUTING/DEVELOPMENT をご確認ください。
- CI ではフロントエンド/バックエンドの検証に加えて Playwright によるE2Eテストと Lighthouse スモークを実行し、失敗時はレポートをアーティファクトとして保存します。ジョブ定義は[`.github/workflows/ci.yml`](.github/workflows/ci.yml)を参照し、GitHub Actions の Summary 画面から Artifacts を開くことで各種レポート（Playwright/Lighthouse 等）を取得できます。

## QA / 検証
- Lint / 型 / テスト
  ```bash
  poetry run ruff check
  poetry run mypy
  poetry run pytest --cov
  ```
- Lighthouse スコア
  ```bash
  npm run build
  npm run preview
  lhci autorun
  ```
  - 主要メトリクス（Performance/Accessibility/Best Practices/SEO）はいずれも 80 点以上を維持すること。

家庭菜園の計画づくりに、Planting Planner をぜひお役立てください。
