# v0.3.1 PWA 基盤 – 設計

## アーキテクチャ
Client → Service Worker → Network/Cache → API

## 擬似コード
```ts
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(isStatic, new StaleWhileRevalidate());
registerRoute(isApiGet, new NetworkFirst({ cacheName: 'api', networkTimeoutSeconds: 4 }));
const bgSync = new BackgroundSyncPlugin('refresh-queue', { maxRetentionTime: 1440 });
registerRoute(isRefreshPost, new NetworkOnly({ plugins: [bgSync] }), 'POST');
```

## データ
- IDB: `sync-queue`（id, url, body, headers, createdAt, attempt, lastFailureAt, lastFailureMessage, failedAt, lastError）
  - `lastFailureAt` / `lastFailureMessage` は直近失敗の監査ログ、`failedAt` / `lastError` は監査用途として保持するのみ（再送抑制処理は未実装・非連動）

## 実装差分
- TODO: 将来的に再送抑制を導入する場合は `failedAt` / `lastError` を判定ロジックへ接続し、仕様と実装の差分がないよう更新する。実装後は本ドキュメントのデータ説明および抑制条件を追記して誤解を避けること

## セキュリティ
- CSP 例: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'wasm-unsafe-eval'; frame-ancestors 'none'`
- SRI（静的配信時）

## テスト
- Unit: キャッシュ戦略・BG Sync キュー
- E2E: 機内モード/再送成功・SW 更新トースト
- CI: Lighthouse(PWA ≥ 90)

## 運用
- `APP_VERSION` をフッターに表示。SW 更新検知→トーストで案内
