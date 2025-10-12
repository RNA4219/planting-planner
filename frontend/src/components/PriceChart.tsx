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

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

type PriceChartProps = {
  cropId: number | null
  marketScope?: MarketScope
  range?: { from?: string; to?: string }
}

const StatusMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p role="status" aria-live="polite">
    {children}
  </p>
)

export const PriceChart: React.FC<PriceChartProps> = ({
  cropId,
  range,
  marketScope = 'national',
}) => {
  const [labels, setLabels] = React.useState<string[]>([])
  const [values, setValues] = React.useState<number[]>([])
  const [title, setTitle] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (cropId == null) {
      setLabels([])
      setValues([])
      setTitle('')
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)
    setLabels([])
    setValues([])
    setTitle('')
    ;(async () => {
      try {
        const res = await fetchPrice(cropId, range?.from, range?.to, marketScope)
        if (!active) return
        setTitle(`${res.crop} (${res.unit})`)
        const points = res.prices ?? []
        setLabels(points.map((p) => p.week))
        setValues(points.map((p) => (p.avg_price ?? NaN)))
      } catch {
        if (active) {
          setLabels([])
          setValues([])
          setTitle('')
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

  if (cropId == null) {
    return <StatusMessage>作物を選択すると価格推移が表示されます。</StatusMessage>
  }

  if (isLoading) {
    return <StatusMessage>価格データを読み込み中です…</StatusMessage>
  }

  if (labels.length === 0) {
    return <StatusMessage>価格データがありません。</StatusMessage>
  }

  const firstWeek = labels[0]
  const lastWeek = labels[labels.length - 1]
  const periodText = firstWeek === lastWeek ? firstWeek : `${firstWeek} 〜 ${lastWeek}`
  const summary = `${title} の週平均価格。期間: ${periodText}。データ点数: ${labels.length}件。`

  return (
    <figure>
      <h4 style={{ margin: '8px 0' }}>{title}</h4>
      <Line
        aria-label={`${title} の価格推移`}
        data={{
          labels,
          datasets: [{ label: '週平均価格', data: values, tension: 0.2 }],
        }}
        options={{
          responsive: true,
          plugins: { legend: { display: true } },
          scales: { y: { beginAtZero: false } },
        }}
      />
      <figcaption>{summary}</figcaption>
    </figure>
  )
}
