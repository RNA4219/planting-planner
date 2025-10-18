import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FeatureFlagConfig } from '../../constants/messages'
import type { MarketScope, PriceSeries } from '../../types'
import type { PriceSeriesResponse } from '../../lib/api'

type PriceChartSectionComponent = (typeof import('../PriceChartSection'))['PriceChartSection']
type PriceChartComponent = (typeof import('../PriceChart'))['PriceChart']
type SectionProps = Parameters<PriceChartSectionComponent>[0]
type ChartProps = Parameters<PriceChartComponent>[0]

declare global {
  // eslint-disable-next-line no-var
  var FEATURE_FLAGS: FeatureFlagConfig | undefined
}

const setLocale = (lang: string, flag: boolean | undefined) => {
  document.documentElement.lang = lang

  if (typeof flag === 'undefined') {
    delete (globalThis as { FEATURE_FLAGS?: FeatureFlagConfig }).FEATURE_FLAGS
    return
  }

  ;(globalThis as { FEATURE_FLAGS?: FeatureFlagConfig }).FEATURE_FLAGS = {
    I18N_EN: flag,
  }
}

const { fetchPriceMock } = vi.hoisted(() => ({
  fetchPriceMock:
    vi.fn<
      (
        cropId: number,
        from?: string,
        to?: string,
        marketScope?: MarketScope,
      ) => Promise<PriceSeriesResponse>
    >(),
}))

vi.mock('../../lib/api', () => ({ fetchPrice: fetchPriceMock }))

const DEFAULT_URL = 'http://localhost/'
const ORIGINAL_LOCATION = window.location

const stubLocation = (href: string) => {
  const url = new URL(href)
  const stub = Object.assign(new URL(url.href), {
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn(),
  }) as unknown as Location
  Object.defineProperty(window, 'location', { configurable: true, value: stub })
}

const renderSectionAndChart = async (sectionProps: SectionProps, chartProps: ChartProps) => {
  vi.doMock('../../lib/api', () => ({ fetchPrice: fetchPriceMock }))
  const [{ PriceChartSection }, { PriceChart }] = await Promise.all([
    import('../PriceChartSection'),
    import('../PriceChart'),
  ])

  render(
    <>
      <PriceChartSection {...sectionProps} />
      <PriceChart {...chartProps} />
    </>,
  )
}

describe('PriceChart i18n', () => {
  beforeEach(() => {
    vi.resetModules()
    stubLocation(DEFAULT_URL)
  })

  afterEach(() => {
    cleanup()
    fetchPriceMock.mockReset()
    setLocale('ja', undefined)
    stubLocation(DEFAULT_URL)
  })

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: ORIGINAL_LOCATION,
    })
  })

  it('既定では日本語文言を表示する', async () => {
    await renderSectionAndChart(
      { selectedCropId: null, marketScope: 'national' },
      { cropId: null, marketScope: 'national' },
    )

    expect(screen.getByRole('heading', { level: 2, name: '価格推移' })).toBeInTheDocument()
    expect(screen.getAllByText('作物を選択すると価格推移が表示されます。')).toHaveLength(2)
    expect(
      screen.getByText('作物一覧で行をクリックすると、価格推移が表示されます。'),
    ).toBeInTheDocument()
  })

  it('英語設定時は英語文言を表示する', async () => {
    setLocale('en', true)
    stubLocation('http://localhost/?lang=en')

    const series: PriceSeries = {
      crop_id: 1,
      crop: 'Tomato',
      unit: 'kg',
      source: 'JA',
      prices: [
        { week: '2024-W01', avg_price: 1200, stddev: null },
        { week: '2024-W02', avg_price: 1100, stddev: null },
      ],
    }

    fetchPriceMock.mockResolvedValue({ series, isMarketFallback: false })

    await renderSectionAndChart(
      { selectedCropId: null, marketScope: 'national' },
      { cropId: 1, marketScope: 'national' },
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Price trend' })).toBeInTheDocument()
    expect(screen.getByText('Select a crop to view price trends.')).toBeInTheDocument()
    expect(
      screen.getByText('Click a row in the crop list to view price trends.'),
    ).toBeInTheDocument()

    await waitFor(() => expect(fetchPriceMock).toHaveBeenCalled())

    expect(
      await screen.findByRole('img', { name: 'Price trend for Tomato (kg)' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText(
        'Weekly average price for Tomato (kg). Period: 2024-W01 to 2024-W02. Data points: 2.',
      ),
    ).toBeInTheDocument()
  })
})
