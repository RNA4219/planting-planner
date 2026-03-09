import { ChangeEvent, lazy, Suspense, useMemo } from 'react'

import { PRICE_CHART_MESSAGES } from '../constants/messages'
import { useCropCatalog } from '../hooks/useCropCatalog'
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
  onSelectCrop: (cropId: number | null) => void
}

const FEATURED_CROP_NAMES = [
  'キャベツ',
  'レタス',
  '白菜',
  'ほうれん草',
  '小松菜',
  'ねぎ',
  '玉ねぎ',
  'にんじん',
  '大根',
  'じゃがいも',
  'トマト',
  'きゅうり',
  'なす',
  'ピーマン',
  'ブロッコリー',
] as const

type CropOption = {
  readonly id: number
  readonly name: string
}

export const PriceChartSection = ({
  selectedCropId,
  marketScope,
  onSelectCrop,
}: PriceChartSectionProps) => {
  const { section, chart } = PRICE_CHART_MESSAGES
  const { catalog, isLoading: isCatalogLoading } = useCropCatalog()
  const cropOptions = useMemo<CropOption[]>(() => {
    const featuredOrder = new Map(
      FEATURED_CROP_NAMES.map((cropName, index) => [cropName.normalize('NFKC'), index]),
    )
    return Array.from(catalog.values())
      .map((entry) => ({ id: entry.id, name: entry.name }))
      .sort((left, right) => {
        const leftOrder = featuredOrder.get(left.name.normalize('NFKC')) ?? Number.MAX_SAFE_INTEGER
        const rightOrder =
          featuredOrder.get(right.name.normalize('NFKC')) ?? Number.MAX_SAFE_INTEGER
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder
        }
        return left.name.localeCompare(right.name, 'ja')
      })
  }, [catalog])

  const handleCropChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value
    onSelectCrop(nextValue === '' ? null : Number(nextValue))
  }

  return (
    <section className="space-y-4 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h2 className="text-xl font-semibold text-market-neutral-strong">{section.heading}</h2>
        <label className="flex w-full max-w-xs flex-col gap-2 text-sm font-medium text-slate-700">
          <span>{section.selectorLabel}</span>
          <select
            aria-label={section.selectorLabel}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-market-accent focus:outline-none focus:ring-2 focus:ring-market-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100"
            value={selectedCropId?.toString() ?? ''}
            onChange={handleCropChange}
            disabled={isCatalogLoading || cropOptions.length === 0}
          >
            <option value="">
              {cropOptions.length === 0 && !isCatalogLoading
                ? section.selectorUnavailable
                : section.selectorPlaceholder}
            </option>
            {cropOptions.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.name}
              </option>
            ))}
          </select>
        </label>
      </div>
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
