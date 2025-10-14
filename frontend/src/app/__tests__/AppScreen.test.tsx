import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppScreen } from '../AppScreen'

describe('AppScreen', () => {
  it('指定されたコンポーネントをレイアウトに埋め込む', () => {
    render(
      <AppScreen
        title="テストタイトル"
        searchControls={<div data-testid="search-controls">search</div>}
        toastStack={<div data-testid="toast-stack">toast</div>}
        fallbackNotice={<div data-testid="fallback-notice">notice</div>}
        recommendationsTable={<div data-testid="recommendations-table">table</div>}
        priceChartSection={<div data-testid="price-chart-section">chart</div>}
      />,
    )

    expect(screen.getByRole('heading', { name: 'テストタイトル' })).toBeInTheDocument()
    expect(screen.getByTestId('search-controls')).toBeInTheDocument()
    expect(screen.getByTestId('toast-stack')).toBeInTheDocument()
    expect(screen.getByTestId('fallback-notice')).toBeInTheDocument()
    expect(screen.getByTestId('recommendations-table')).toBeInTheDocument()
    expect(screen.getByTestId('price-chart-section')).toBeInTheDocument()
  })
})
