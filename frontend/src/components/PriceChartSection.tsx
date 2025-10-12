import { PriceChart } from './PriceChart'
import type { MarketScope } from '../types'

interface PriceChartSectionProps {
  selectedCropId: number | null
  marketScope: MarketScope
}

export const PriceChartSection = ({ selectedCropId, marketScope }: PriceChartSectionProps) => (
  <section className="recommend__chart">
    <h2>価格推移</h2>
    <PriceChart
      cropId={selectedCropId}
      marketScope={marketScope}
      range={{ from: undefined, to: undefined }}
    />
    <p className="recommend__chart-hint">作物一覧で行をクリックすると、価格推移が表示されます。</p>
  </section>
)

PriceChartSection.displayName = 'PriceChartSection'
