import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FeatureFlagConfig } from '../../constants/messages'

declare global {
  // eslint-disable-next-line no-var
  var FEATURE_FLAGS: FeatureFlagConfig | undefined
}

type LineProps = {
  readonly ['aria-label']?: string
  readonly data: {
    readonly labels: readonly string[]
    readonly datasets: readonly { readonly label: string }[]
  }
}

type Scenario = {
  readonly name: string
  readonly url: string
  readonly featureFlag?: boolean
  readonly heading: string
  readonly selectPrompt: string
  readonly instruction: string
  readonly loading: string
  readonly chartAria: string
  readonly summary: string
  readonly datasetLabel: string
}

const DEFAULT_URL = 'http://localhost/'
const ORIGINAL_LOCATION = window.location

const stubLocation = (href: string) => {
  const url = new URL(href)
  const stub = Object.assign(new URL(url.href), {
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn(),
  }) as unknown as Location
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: stub,
  })
}

const resetEnvironment = () => {
  cleanup()
  vi.resetModules()
  vi.clearAllMocks()
  delete (globalThis as { FEATURE_FLAGS?: FeatureFlagConfig }).FEATURE_FLAGS
  stubLocation(DEFAULT_URL)
  document.documentElement.lang = 'ja'
}

const sampleResponse = {
  series: {
    crop_id: 1,
    crop: 'テスト作物',
    unit: 'kg',
    source: 'テスト',
    prices: [
      { week: '2024-W01', avg_price: 100, stddev: null },
      { week: '2024-W02', avg_price: 150, stddev: null },
    ],
  },
  isMarketFallback: false,
}

const loadModules = async () => {
  const fetchPrice = vi.fn().mockResolvedValue(sampleResponse)
  const recordLineProps = vi.fn<(props: LineProps) => void>()

  vi.doMock('../../lib/api', () => ({ fetchPrice }))
  vi.doMock('react-chartjs-2', () => ({
    Line: (props: LineProps) => {
      recordLineProps(props)
      return (
        <div
          role="img"
          aria-label={props['aria-label'] ?? ''}
          data-testid="price-chart"
        />
      )
    },
  }))

  const [{ PriceChartSection }, { PriceChart }] = await Promise.all([
    import('../PriceChartSection'),
    import('../PriceChart'),
  ])

  return { PriceChartSection, PriceChart, fetchPrice, recordLineProps }
}

const scenarios: readonly Scenario[] = [
  {
    name: '日本語',
    url: DEFAULT_URL,
    heading: '価格推移',
    selectPrompt: '作物を選択すると価格推移が表示されます。',
    instruction: '作物一覧で行をクリックすると、価格推移が表示されます。',
    loading: '価格データを読み込み中です…',
    chartAria: 'テスト作物 (kg) の価格推移',
    summary: 'テスト作物 (kg) の週平均価格。期間: 2024-W01 〜 2024-W02。データ点数: 2件。',
    datasetLabel: '週平均価格',
  },
  {
    name: '英語',
    url: 'http://localhost/?lang=en',
    featureFlag: true,
    heading: 'Price trend',
    selectPrompt: 'Select a crop to view its price trend.',
    instruction: 'Select a row in the crop list to view its price trend.',
    loading: 'Loading price data…',
    chartAria: 'Price trend for テスト作物 (kg)',
    summary:
      'Weekly average price for テスト作物 (kg). Period: 2024-W01 – 2024-W02. Data points: 2.',
    datasetLabel: 'Weekly average price',
  },
] as const

describe('PriceChart i18n', () => {
  beforeEach(() => {
    resetEnvironment()
  })

  afterEach(() => {
    resetEnvironment()
  })

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: ORIGINAL_LOCATION,
    })
  })

  it.each(scenarios)('%s設定時に文言を表示する', async (scenario) => {
    if (typeof scenario.featureFlag !== 'undefined') {
      ;(globalThis as { FEATURE_FLAGS?: FeatureFlagConfig }).FEATURE_FLAGS = {
        I18N_EN: scenario.featureFlag,
      }
    }

    stubLocation(scenario.url)

    const { PriceChartSection, PriceChart, fetchPrice, recordLineProps } =
      await loadModules()

    const section = render(
      <PriceChartSection selectedCropId={null} marketScope="national" />,
    )

    expect(
      await screen.findByRole('heading', { name: scenario.heading }),
    ).toBeInTheDocument()
    expect(screen.getByText(scenario.selectPrompt)).toBeInTheDocument()
    expect(screen.getByText(scenario.instruction)).toBeInTheDocument()

    section.unmount()

    const chart = render(<PriceChart cropId={1} />)

    expect(screen.getByText(scenario.loading)).toBeInTheDocument()

    await waitFor(() => {
      expect(fetchPrice).toHaveBeenCalled()
      expect(recordLineProps).toHaveBeenCalled()
    })

    expect(screen.getByRole('heading', { name: 'テスト作物 (kg)' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: scenario.chartAria })).toBeInTheDocument()
    expect(screen.getByText(scenario.summary)).toBeInTheDocument()

    const lastCall = recordLineProps.mock.calls[
      recordLineProps.mock.calls.length - 1
    ]?.[0] as LineProps | undefined
    expect(lastCall?.data.datasets[0]?.label).toBe(scenario.datasetLabel)

    chart.unmount()
  })
})
