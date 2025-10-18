# 型仕様 — v0.3

- TypeScript: `type MarketScope = 'national' | \`city:${string}\`` を追加する。
  カテゴリ選択は既存の `CropCategory('leaf'|'root'|'flower')` を共有して利用する。
- API レスポンス: 既存 `RecommendationResponse` に変更はなく、`marketScope` はクライアント
  リクエストのみで使用し、レスポンスには含めない。
- Python: `MarketScope = Literal['national']` と
  `Annotated[str, StartsWith('city:')]` を `schemas.py` に定義する。
  `validate_market_scope` で検証する。
- Store: Zustand を採用し、`frontend/src/hooks/recommendations/store.ts` のストアで
  `selectedMarket: MarketScope` と `selectedCategory: CropCategory` を保持する。
