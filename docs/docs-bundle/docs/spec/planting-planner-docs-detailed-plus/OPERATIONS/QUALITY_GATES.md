# Quality Gates

- Lighthouse (Mobile): PWA ≥ 0.90 / Perf ≥ 0.80 / A11y ≥ 0.90
- Web Vitals (RUM, P75): LCP < 2.5s / INP < 200ms / CLS < 0.1
- E2E 必須経路: 起動→検索→地域切替→/refresh→オフライン→復帰→シェア
- API エラー率（5分ロールアップ）: < 1%
- PWA 失敗率（SW登録/Sync 失敗）: < 2%
