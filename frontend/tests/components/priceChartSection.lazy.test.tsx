import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

type PriceChartModule = typeof import('../../src/components/PriceChart')

const { importSpy, PriceChartMock } = vi.hoisted(() => ({
  importSpy: vi.fn(),
  PriceChartMock: vi.fn(() => <div data-testid="price-chart">chart</div>),
}))

vi.mock('../../src/components/PriceChart', (): PriceChartModule => {
  importSpy()
  return {
    PriceChart: PriceChartMock as PriceChartModule['PriceChart'],
  }
})

describe('PriceChartSection', () => {
  beforeEach(() => {
    vi.resetModules()
    importSpy.mockClear()
    PriceChartMock.mockClear()
  })

  test('作物未選択時はチャートモジュールを遅延読込せず案内を表示する', async () => {
    const { PriceChartSection } = await import('../../src/components/PriceChartSection')

    render(<PriceChartSection selectedCropId={null} marketScope="national" />)

    expect(
      screen.getByText('作物一覧で行をクリックすると、価格推移が表示されます。'),
    ).toBeInTheDocument()
    expect(importSpy).not.toHaveBeenCalled()
    expect(PriceChartMock).not.toHaveBeenCalled()
  })

  test('作物選択時にチャートモジュールを読み込み描画する', async () => {
    const { PriceChartSection } = await import('../../src/components/PriceChartSection')

    render(<PriceChartSection selectedCropId={42} marketScope="national" />)

    await waitFor(() => {
      expect(importSpy).toHaveBeenCalled()
    })
    await screen.findByTestId('price-chart')
    const [props] = PriceChartMock.mock.calls.at(-1) ?? []
    expect(props).toEqual({
      cropId: 42,
      marketScope: 'national',
      range: { from: undefined, to: undefined },
    })
  })
})
