# v0.4.1 天候 – 設計

## Adapter
interface WeatherAdapter { getDaily(lat, lon): Promise<{ daily, fetchedAt }> }

## キャッシュ
- サーバ: 24h
- クライアント: React Query staleTime=2h, key=`weather:{regionId}`

## テスト
- Provider モック、低帯域・オフライン動作、バックオフ検証
