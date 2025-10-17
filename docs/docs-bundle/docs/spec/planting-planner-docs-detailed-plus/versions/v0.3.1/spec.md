# v0.3.1 PWA 基盤 – 仕様

## 1. Manifest
- name, short_name, start_url="/", display="standalone", background_color, theme_color
- icons: 192 / 512 / maskable PNG

## 2. Service Worker / Caching
### 2.1 Precache
- ビルド生成物（`*.js`, `*.css`, フォント/ロゴ）を manifest に含める
### 2.2 Runtime Cache
- 静的資産: Stale-While-Revalidate
- `GET /api/*`: Network-First（失敗時 `cache.match` フォールバック）
- キャッシュキー: `api:{method}:{url}:{query}:v{schemaVersion}:e{dataEpoch}`
### 2.3 Background Sync（`POST /api/refresh`）
- 失敗時 payload を IndexedDB('sync-queue') に保存、`tag='refresh-queue'`
- `sync` イベントで再送、指数バックオフ（最大 3 回）

## 3. 冪等性 / 更新通知
- **Idempotency-Key**: `/api/refresh` に必須（再送時に同一値）
- **SW 更新**: `waiting` → `postMessage({type:'SW_WAITING', version})` → UI トースト → `postMessage({type:'SKIP_WAITING'})`

## 4. テレメトリ
- `sw.fetch.cache_hit` / `bg.sync.retry` / `bg.sync.succeeded` / `bg.sync.failed`
  - API クライアントが付与した `x-request-id` ヘッダを Service Worker が保持し、イベントに `requestId` を渡す。
- `sw.waiting`
  - `frontend/src/lib/swClient.ts` が `postMessage({type:'SW_WAITING', version})` を受信した際に発火する。ネットワークリクエストを伴わないメッセージ起点のイベントのため、`requestId` は付与されない。
- `sw.register.failed`
  - `frontend/src/lib/swClient.ts` が `navigator.serviceWorker.register` の例外を捕捉した際に発火する。登録処理が HTTP リクエストに至る前に失敗するケースがあり、`requestId` を割り当てられないまま送信される。
- `sw.install` / `offline.banner_shown`
  - 通信が発生しないイベントのためヘッダが存在せず、`requestId` は `undefined` のまま送信される。

## 5. エラー
- `fetch` 失敗: キャッシュ有→表示 / 無→「取得不可」トースト
- BG Sync 不可: 再試行ボタンを表示

## 6. 未解決の実装差分
- BG Sync 失敗時、`recordFailure` は `sync-queue` のエントリを削除せずに `lastFailureAt` / `lastFailureMessage` を記録する。Runbook の「BG Sync 失敗時の点検」で失敗 payload を監査できる。
