# 型仕様 — v0.3

- TypeScript: `type MarketScope = 'national' | \`city:${string}\`;`を追加し、カテゴリ選択は既存の`CropCategory` (`'leaf'|'root'|'flower'`) をそのまま共有して利用する。
- API レスポンス: 既存 `RecommendationResponse` に変更なし。`marketScope` はクライアントリクエストのみで使用し、レスポンスには含めない。
- Python: `MarketScope = Literal['national'] | Annotated[str, StartsWith('city:')]` を `schemas.py` に定義し、`validate_market_scope` で検証。
- Store: Zustand/Redux いずれの場合も `selectedMarket: MarketScope` と `selectedCategory: CropCategory` を必須プロパティとする。
