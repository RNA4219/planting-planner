import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { PriceChart } from '../../src/components/PriceChart'
import * as api from '../../src/lib/api'

const getLatestStatus = () => {
  const statuses = screen.getAllByRole('status')
  return statuses[statuses.length - 1]
}

describe('PriceChart live region announcements', () => {
  let fetchPriceSpy: ReturnType<typeof vi.spyOn<typeof api, 'fetchPrice'>>

  beforeEach(() => {
    fetchPriceSpy = vi.spyOn(api, 'fetchPrice')
  })

  afterEach(() => {
    fetchPriceSpy.mockRestore()
  })

  test('作物未選択時のメッセージはpoliteライブリージョンで通知される', () => {
    render(<PriceChart cropId={null} />)

    const status = getLatestStatus()
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('作物を選択すると価格推移が表示されます。')
    expect(fetchPriceSpy).not.toHaveBeenCalled()
  })

  test('価格データ読込中のメッセージはpoliteライブリージョンで通知される', async () => {
    fetchPriceSpy.mockReturnValue(new Promise(() => {}) as never)

    render(<PriceChart cropId={1} />)

    await waitFor(() => {
      expect(getLatestStatus()).toHaveTextContent('価格データを読み込み中です…')
    })

    expect(getLatestStatus()).toHaveAttribute('aria-live', 'polite')
  })

  test('価格データが空の場合のメッセージはpoliteライブリージョンで通知される', async () => {
    fetchPriceSpy.mockResolvedValue({
      crop_id: 1,
      crop: 'トマト',
      unit: 'kg',
      source: 'テスト',
      prices: [],
    })

    render(<PriceChart cropId={1} />)

    await waitFor(() => {
      expect(fetchPriceSpy).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(getLatestStatus()).toHaveTextContent('価格データがありません。')
    })

    expect(getLatestStatus()).toHaveAttribute('aria-live', 'polite')
  })
})
