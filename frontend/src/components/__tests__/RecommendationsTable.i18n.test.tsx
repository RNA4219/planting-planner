import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FeatureFlagConfig } from '../../constants/messages'
import type { RecommendationRow } from '../../hooks/recommendations/controller'
import type { MarketScope, Region } from '../../types'

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

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

interface RenderOptions {
  readonly region?: Region
  readonly displayWeek?: string
  readonly rows?: RecommendationRow[]
  readonly selectedCropId?: number | null
  readonly marketScope?: MarketScope
  readonly isLoading?: boolean
}

const renderRecommendationsTable = async ({
  region = 'temperate',
  displayWeek = '2024-W10',
  rows = [],
  selectedCropId = null,
  marketScope = 'national',
  isLoading = false,
}: RenderOptions = {}) => {
  const queryClient = createQueryClient()
  queryClient.setQueryData(['markets'], {
    markets: [],
    generated_at: '1970-01-01T00:00:00Z',
  })

  const { RecommendationsTable } = await import('../RecommendationsTable')

  const result = render(
    <QueryClientProvider client={queryClient}>
      <RecommendationsTable
        region={region}
        displayWeek={displayWeek}
        rows={rows}
        selectedCropId={selectedCropId}
        onSelect={() => {}}
        onToggleFavorite={() => {}}
        isFavorite={() => false}
        marketScope={marketScope}
        isLoading={isLoading}
      />
    </QueryClientProvider>,
  )

  return { ...result, queryClient }
}

describe('RecommendationsTable i18n', () => {
  beforeEach(() => {
    stubLocation(DEFAULT_URL)
  })

  afterEach(() => {
    cleanup()
    vi.resetModules()
    setLocale('ja', undefined)
    stubLocation(DEFAULT_URL)
  })

  afterAll(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: ORIGINAL_LOCATION })
  })

  it('英語設定時にテキストを英語で表示する', async () => {
    vi.resetModules()
    setLocale('en', true)
    stubLocation('http://localhost/?lang=en')

    const rows: RecommendationRow[] = [
      {
        crop: 'Tomato',
        cropId: 1,
        category: 'flower',
        growth_days: 70,
        sowing_week: '2024-W10',
        harvest_week: '2024-W20',
        sowingWeekLabel: '2024-W10',
        harvestWeekLabel: '2024-W20',
        source: 'National average',
        rowKey: 'Tomato-2024-W10-2024-W20',
      },
    ]

    const { queryClient } = await renderRecommendationsTable({ rows })

    expect(
      screen.getByRole('table', {
        name: 'Recommendations for Temperate region (Baseline week: 2024-W10)',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Region: Temperate region')).toBeInTheDocument()
    expect(screen.getByText('Baseline week: 2024-W10')).toBeInTheDocument()
    expect(screen.getByText('Category: Flower crops')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader', { name: 'Crop' })).not.toHaveLength(0)
    expect(screen.getByText('Sowing week')).toBeInTheDocument()
    expect(screen.getByText('Harvest week')).toBeInTheDocument()
    expect(screen.getAllByText('Source').length).toBeGreaterThan(0)

    queryClient.clear()

    cleanup()

    const emptyRender = await renderRecommendationsTable({ rows: [] })

    expect(screen.getByText('No recommendations available')).toBeInTheDocument()
    expect(
      screen.getByText('Try adjusting the market or category filters.'),
    ).toBeInTheDocument()

    emptyRender.queryClient.clear()
  })

  it('英語フラグ無効時は日本語の文言にフォールバックする', async () => {
    vi.resetModules()
    setLocale('ja', false)
    stubLocation(DEFAULT_URL)

    const { queryClient } = await renderRecommendationsTable({ rows: [] })

    expect(screen.getByText('対象地域: 温暖地')).toBeInTheDocument()
    expect(screen.getByText('基準週: 2024-W10')).toBeInTheDocument()
    expect(screen.getByText('推奨データがありません')).toBeInTheDocument()
    expect(
      screen.getByText('市場やカテゴリを変更して再度お試しください。'),
    ).toBeInTheDocument()

    queryClient.clear()
  })
})
