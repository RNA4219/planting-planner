# ETL 仕様 — v0.3

- 都市別市場価格: 既存スクレイパーに `city_id` ごとの正規化を追加し、欠損時は全国平均を複製せず参照で返却。
- メタデータ: `market_metadata` に表示名・タイムゾーン・優先度を格納し、UI トグルの並び順を制御。ETL 完了後に JSON キャッシュを再生成。
- カテゴリ整備: `_resolve_categories` が `market_prices` と `crops` からカテゴリを再構築し、作物カテゴリの欠損を補完する現行挙動を明記する。
- バリデーション: `backend/app/etl/expectations.validate_market_prices` が scope 値と価格レンジを独自検証し、失敗時は市場データを全国平均へフォールバックして警告ログを残す現行挙動を明示する。
