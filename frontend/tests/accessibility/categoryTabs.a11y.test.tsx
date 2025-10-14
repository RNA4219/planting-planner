import '@testing-library/jest-dom/vitest'

import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  fetchRecommend,
  fetchRecommendations,
  fetchCrops,
  renderApp,
} from '../utils/renderApp'

const getActiveTab = async () => {
  const activeTabs = await screen.findAllByRole('tab', { selected: true })
  return activeTabs[activeTabs.length - 1] as HTMLButtonElement
}

describe('アクセシビリティ: CategoryTabs', () => {
  it('アクティブタブと推奨テーブルがaria属性で接続されている', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([
      { id: 1, name: 'レタス', category: 'leaf' },
      { id: 2, name: 'ニンジン', category: 'root' },
    ])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        {
          crop: 'レタス',
          sowing_week: '2024-W30',
          harvest_week: '2024-W32',
          source: 'テスト',
          growth_days: 14,
        },
      ],
      isMarketFallback: false,
    })

    await renderApp()
    await screen.findAllByTestId('recommendation-card')

    const panel = await screen.findByRole('tabpanel')
    const panelId = panel.getAttribute('id')

    const activeTab = await getActiveTab()
    expect(activeTab).toHaveAttribute('id', 'category-tab-leaf')

    expect(panelId).toBeTruthy()
    expect(activeTab).toHaveAttribute('aria-controls', panelId as string)
    expect(panel).toHaveAttribute('aria-labelledby', 'category-tab-leaf')
  })
})
