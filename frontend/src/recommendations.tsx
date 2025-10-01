import { FavStar } from './components/FavStar'
import { formatIsoWeek } from './lib/week'
import type { RecommendationRow } from './hooks/useRecommendations'
export { useRecommendations } from './hooks/useRecommendations'
export type { RecommendationRow } from './hooks/useRecommendations'

interface RecommendationsTableProps {
  rows: RecommendationRow[]
  isFavorite: (cropId?: number) => boolean
  onToggleFavorite: (cropId?: number) => void
}

export const RecommendationsTable = ({ rows, isFavorite, onToggleFavorite }: RecommendationsTableProps) => (
  <table className="recommend__table">
    <thead>
      <tr>
        <th scope="col">作物</th>
        <th scope="col">播種週</th>
        <th scope="col">収穫週</th>
        <th scope="col">情報源</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((item) => (
        <tr key={`${item.crop}-${item.sowing_week}-${item.harvest_week}`}>
          <td>
            <div className="recommend__crop">
              <FavStar
                active={isFavorite(item.cropId)}
                cropName={item.crop}
                onToggle={() => onToggleFavorite(item.cropId)}
              />
              <span>{item.crop}</span>
            </div>
          </td>
          <td>{formatIsoWeek(item.sowing_week)}</td>
          <td>{formatIsoWeek(item.harvest_week)}</td>
          <td>{item.source}</td>
        </tr>
      ))}
      {rows.length === 0 && (
        <tr>
          <td colSpan={4} className="recommend__empty">
            推奨データがありません
          </td>
        </tr>
      )}
    </tbody>
  </table>
)
