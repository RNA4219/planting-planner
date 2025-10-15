import { PriceChart } from './PriceChart'
import type { MarketScope } from '../types'

interface PriceChartSectionProps {
  selectedCropId: number | null
  marketScope: MarketScope
}

export const PriceChartSection = ({ selectedCropId, marketScope }: PriceChartSectionProps) => (
  <section className="space-y-4 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
    <h2 className="text-xl font-semibold text-market-neutral-strong">価格推移</h2>
    <PriceChart
      cropId={selectedCropId}
      marketScope={marketScope}
      range={{ from: undefined, to: undefined }}
    />
    <p className="text-sm text-slate-500">
      作物一覧で行をクリックすると、価格推移が表示されます。
    </p>
  </section>
)

PriceChartSection.displayName = 'PriceChartSection'
