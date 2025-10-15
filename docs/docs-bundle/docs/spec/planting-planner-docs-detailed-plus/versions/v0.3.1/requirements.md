# v0.3.1 PWA 基盤 – 要件

## ゴール
- 圃場でオフラインでも**直近データの閲覧**が可能。
- ホーム画面に追加して**1タップ起動**。`/api/refresh` は BG Sync で後送。

## スコープ（In）
- Web App Manifest（名称/アイコン/`start_url`/`display: standalone`/`scope`）
- Service Worker（Workbox）: Precache / Runtime Cache / Background Sync
- オフライン UI（ステータスバー/最終同期時刻）
- Lighthouse CI（PWA ≥ 90）

## スコープ（Out）
- プッシュ通知、オフライン編集/差分マージ、複数端末同期

## 非機能要件（共通）

- **性能 (Perf budgets)**  
  - LCP < 2.5s（3G 相当 / Moto G4 相当）  
  - JS 転送 ≤ 300KB (gzip) / 画像は遅延ロード 100%  
- **可用性**: 主要機能 99.5% 稼働（フロントのオフライン耐性で補助）
- **セキュリティ**: CSP 設定、SW スコープ最小化、SRI（静的配信時）
- **アクセシビリティ**: キーボード操作、SR ラベル、コントラスト比 4.5:1
- **観測性**: `/healthz`、RUM(LCP/INP/CLS)、主要イベント JSON ログ


## 制約・前提
- iOS Safari は BG Sync 非対応 → UI で再試行ボタンを提供
- 既存 API 仕様は変更しない（冪等性ヘッダの追加は許容）

## 受入基準（AC）
- [ ] **AC-031-001** Add to Home Screen が表示され、スタンドアロン起動できる
- [ ] **AC-031-002** オフラインで静的画面が表示できる（Precache）
- [ ] **AC-031-003** `GET /api/*` 失敗時に最後の成功レスポンスで UI 表示
- [ ] **AC-031-004** `POST /api/refresh` 送信失敗→復帰後 BG Sync 自動再送で成功
- [ ] **AC-031-005** BG Sync 非対応環境で再試行ボタンにより成功
- [ ] **AC-031-006** Lighthouse(PWA) スコア 90 以上
- [ ] **AC-031-007** 全リクエストに `x-request-id` を付与し、フロント→API→サーバログで一致
- [ ] **AC-031-008** 新 SW 検知→トースト→「今すぐ更新」で `APP_VERSION` が更新

## 追記 – 運用で効く詰め
- **キャッシュ無効化規約**: すべての `api:*` キーに `schemaVersion` と `dataEpoch` を付与し、ドメインイベントで `dataEpoch` をインクリメント
- **PWA 更新戦略**: `skipWaiting` は既定無効。新 SW 検知トーストからのみ実行
- **相関ID**: `x-request-id` を必須化（RUM・サーバログで突合）
