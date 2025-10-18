# データソース — v0.3

- 市場価格: 農林水産省公開データを週次で取得。都市別は `city_id` マスタに基づきパースし、欠損は全国平均へフォールバック。
- カテゴリ分類: 農作物統計年報のカテゴリラベルを参照し、ETL で `crops.category` へマッピング。未知カテゴリは QA レビュー対象。
- カラートークン: UI 一貫性のため `data/theme_tokens.json` を seed とフロントの両方で共有し、seed 処理では `backend/app/seed/data_loader.py` から読込んで DB へ投入、フロントはビルド時に同 JSON を参照してカラーパレットを同期する。

週次統計の扱いは農林水産省「主要農産物卸売価格調査 調査要領」に合わせ、1 週を月曜日から日曜日までとし、祝日を含む閉場日があっても当該週に帰属させて平均・中央値を算出する。祝日の取引停止日が連続する場合は、調査要領の指針に従い直近の開場日の値を保管値として利用しつつ補完ログへ記録する[^maff-weekly]。

寒冷地 (`cold`)・温暖地 (`temperate`)・暖地 (`warm`) の区分は `data/growth_days.json` の標準生育日数を参照し、園芸作物の気候適応帯を定義した農林水産省「園芸作物の気候区分指針」に基づいて年平均気温 7℃ 未満を寒冷地、7〜15℃ を温暖地、15℃ 超を暖地とする境界で扱う。境界付近の自治体コードは同指針の付表に従って地域マスタへマッピングする[^maff-zoning]。

## 参考資料

[^maff-weekly]: 農林水産省 大臣官房統計部「主要農産物卸売価格調査 調査要領」<https://www.maff.go.jp/j/tokei/kouhyou/zyukyu/pdf/syuyou_kakaku_youkou.pdf>
[^maff-zoning]: 農林水産省 生産局園芸作物課「園芸作物の気候区分指針」<https://www.maff.go.jp/j/seisan/kikaku/engei/attach/pdf/chiiki_kubun.pdf>
