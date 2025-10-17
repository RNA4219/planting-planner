import { lazy, Suspense } from 'react'

import type { MarketScope } from '../types'
import { PRICE_CHART_MESSAGES } from '../constants/messages'

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

export const PriceChartSection = ({ selectedCropId, marketScope }: PriceChartSectionProps) => (
  <section className="space-y-4 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
    <h2 className="text-xl font-semibold text-market-neutral-strong">
      {PRICE_CHART_MESSAGES.section.heading}
    </h2>
    {selectedCropId == null ? (
      <StatusMessage>{PRICE_CHART_MESSAGES.status.selectPrompt}</StatusMessage>
    ) : (
      <Suspense fallback={<StatusMessage>{PRICE_CHART_MESSAGES.section.suspense}</StatusMessage>}>
        <LazyPriceChart
          cropId={selectedCropId}
          marketScope={marketScope}
          range={{ from: undefined, to: undefined }}
        />
      </Suspense>
    )}
    <p className="text-sm text-slate-500">{PRICE_CHART_MESSAGES.section.instruction}</p>
  </section>
)

PriceChartSection.displayName = 'PriceChartSection'
