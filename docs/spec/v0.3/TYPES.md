# 型仕様 — v0.3

- TypeScript:
  - 型定義は以下のとおり。

    ```ts
    type MarketScope = 'national' | `city:${string}`;
    ```

  - カテゴリ選択は既存の `CropCategory` (`'leaf' | 'root' | 'flower'`) を共有して利用する。
- API レスポンス:
  - 既存 `RecommendationResponse` に変更なし。
  - `marketScope` はクライアントリクエストのみで使用し、レスポンスには含めない。
- Python:
  - 型定義は以下のとおり。

    ```python
    MarketScope = Literal['national'] | Annotated[str, StartsWith('city:')]
    ```

    `schemas.py` に定義する。
  - `validate_market_scope` で値を検証する。
- Store:
  - Redux ではなく Zustand を採用。
  - `frontend/src/hooks/recommendations/store.ts` のストアで
    `selectedMarket: MarketScope` と `selectedCategory: CropCategory` を保持する。
