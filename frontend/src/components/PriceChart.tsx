import React from 'react'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

import { fetchPrice } from '../lib/api'
import type { MarketScope } from '../types'
import { PRICE_CHART_MESSAGES, TOAST_MESSAGES } from '../constants/messages'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

type PriceChartProps = {
  cropId: number | null
  marketScope?: MarketScope
  range?: { from?: string; to?: string }
}

const StatusMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p
    role="status"
    aria-live="polite"
    className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600"
  >
    {children}
  </p>
)

export const PriceChart: React.FC<PriceChartProps> = ({
  cropId,
  range,
  marketScope = 'national',
}) => {
  const { chart } = PRICE_CHART_MESSAGES
  const [labels, setLabels] = React.useState<string[]>([])
  const [values, setValues] = React.useState<number[]>([])
  const [title, setTitle] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [isFallback, setIsFallback] = React.useState(false)

  React.useEffect(() => {
    if (cropId == null) {
      setLabels([])
      setValues([])
      setTitle('')
      setIsLoading(false)
      setIsFallback(false)
      return
    }

    let active = true
    setIsLoading(true)
    setLabels([])
    setValues([])
    setTitle('')
    setIsFallback(false)
    ;(async () => {
      try {
        const res = await fetchPrice(cropId, range?.from, range?.to, marketScope)
        if (!active) return
        setTitle(`${res.series.crop} (${res.series.unit})`)
        const points = res.series.prices ?? []
        setLabels(points.map((p) => p.week))
        setValues(points.map((p) => p.avg_price ?? NaN))
        setIsFallback(res.isMarketFallback)
      } catch {
        if (active) {
          setLabels([])
          setValues([])
          setTitle('')
          setIsFallback(false)
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [cropId, range?.from, range?.to, marketScope])

  const fallbackNotice = isFallback ? (
    <p
      role="alert"
      aria-live="assertive"
      className="rounded-lg border border-market-warning/50 bg-market-warning/10 px-4 py-3 text-sm font-semibold text-market-warning"
    >
      {TOAST_MESSAGES.recommendationFallbackWarning}
    </p>
  ) : null

  if (cropId == null) {
    return (
      <>
        {fallbackNotice}
        <StatusMessage>{chart.status.idle}</StatusMessage>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        {fallbackNotice}
        <StatusMessage>{chart.status.loading}</StatusMessage>
      </>
    )
  }

  if (labels.length === 0) {
    return (
      <>
        {fallbackNotice}
        <StatusMessage>{chart.status.empty}</StatusMessage>
      </>
    )
  }

  const firstWeek = labels[0]!
  const lastWeek = labels[labels.length - 1]!
  const periodText = firstWeek === lastWeek ? firstWeek : chart.periodRange(firstWeek, lastWeek)
  const summary = chart.summary(title, periodText, labels.length)

  return (
    <>
      {fallbackNotice}
      <figure className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-base font-semibold text-slate-900">{title}</h4>
        <div className="mt-6">
          <Line
            aria-label={chart.ariaLabel(title)}
            data={{
              labels,
              datasets: [{ label: chart.legendLabel, data: values, tension: 0.2 }],
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: true } },
              scales: { y: { beginAtZero: false } },
            }}
          />
        </div>
        <figcaption className="mt-4 text-sm text-slate-600">{summary}</figcaption>
      </figure>
    </>
  )
}
