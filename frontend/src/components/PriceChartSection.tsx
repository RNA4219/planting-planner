import { lazy, Suspense } from 'react'

import { PRICE_CHART_MESSAGES } from '../constants/messages'
import type { MarketScope } from '../types'

const LazyPriceChart = lazy(async () => {
  const module = await import('./PriceChart')
  return { default: module.PriceChart }
})

const StatusMessage = ({ children }: { children: string }) => (
  <p
    role="status"
    aria-live="polite"
    className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600"
  >
    {children}
  </p>
)

interface PriceChartSectionProps {
  selectedCropId: number | null
  marketScope: MarketScope
}

export const PriceChartSection = ({ selectedCropId, marketScope }: PriceChartSectionProps) => {
  const { section, chart } = PRICE_CHART_MESSAGES

  return (
    <section className="space-y-4 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
      <h2 className="text-xl font-semibold text-market-neutral-strong">{section.heading}</h2>
      {selectedCropId == null ? (
        <StatusMessage>{chart.status.idle}</StatusMessage>
      ) : (
        <Suspense fallback={<StatusMessage>{section.loading}</StatusMessage>}>
          <LazyPriceChart
            cropId={selectedCropId}
            marketScope={marketScope}
            range={{ from: undefined, to: undefined }}
          />
        </Suspense>
      )}
      <p className="text-sm text-slate-500">{section.hint}</p>
    </section>
  )
}

PriceChartSection.displayName = 'PriceChartSection'
