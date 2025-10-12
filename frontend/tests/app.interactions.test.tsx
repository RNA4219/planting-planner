/**
 * エントリポイントのスモークテストのみを保持します。
 * 詳細なインタラクションケースは ./forms, ./regions, ./favorites, ./prices 以下に配置してください。
 */
import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { createInteractionsHarness } from './utils/interactionsHarness'

const harness = createInteractionsHarness()
const { renderApp, fetchRecommend, fetchRecommendations, fetchCrops } = harness

describe('App interactions smoke', () => {
  test('初期レンダリングで推奨データを要求する', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [],
    })

    await renderApp()

    await screen.findByLabelText('地域')
    expect(fetchRecommendations).toHaveBeenCalledWith(
      'temperate',
      '2024-W30',
      expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
    )
  })
})
