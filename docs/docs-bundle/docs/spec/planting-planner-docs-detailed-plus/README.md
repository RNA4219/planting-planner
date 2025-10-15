# Planting Planner – Versioned Docs (Detailed+)
各バージョンごとの **要件 / 仕様 / 設計** を実装直結の粒度で記述し、
さらに以下の“詰め”を組み込み済みです：
- キャッシュ無効化規約（schemaVersion / dataEpoch / ETag）
- BG Sync 冪等性（Idempotency-Key）
- ストレージ上限と自動追い出し
- PWA 更新戦略（手動 skipWaiting）
- RUM/ログ相関（x-request-id）
- セキュリティ最小セット（CSP/SRI）
- Compatibility Matrix / Quality Gates / Runbook / Feature Flags

対象:
- v0.3.1 PWA基盤
- v0.3.2 モバイル最適化
- v0.3.3 現場補助（先読み・共有）
- v0.4.0 Compose + DBスイッチ
- v0.4.1 天候データ統合 Phase1
- v0.4.2 i18n基盤
