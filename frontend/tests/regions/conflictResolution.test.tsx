import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import type { RecommendResponse } from '../../src/types'
import { createInteractionsHarness } from '../utils/interactionsHarness'

const harness = createInteractionsHarness()
const { fetchRecommend, fetchCrops, fetchRecommendations, renderApp } = harness

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('Region switching interactions', () => {
  test('地域切替時に遅延レスポンスが上書きされない', async () => {
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
    fetchCrops.mockResolvedValue([
      { id: 1, name: 'トマト', category: '果菜類' },
      { id: 2, name: 'キャベツ', category: '葉菜類' },
    ])

    const firstRequest = createDeferred<RecommendResponse>()
    const secondRequest = createDeferred<RecommendResponse>()

    fetchRecommendations.mockImplementationOnce((region, week, options) => {
      void region
      void week
      void options
      return firstRequest.promise
    })
    fetchRecommendations.mockImplementationOnce((region, week, options) => {
      void region
      void week
      void options
      return secondRequest.promise
    })

    const { user } = await renderApp()

    const regionSelect = await screen.findByLabelText('地域')
    await user.selectOptions(regionSelect, 'cold')

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenNthCalledWith(
        2,
        'cold',
        '2024-W30',
        expect.objectContaining({ marketScope: 'national', category: 'leaf' }),
      )
    })

    secondRequest.resolve({
      week: '2024-W30',
      region: 'cold',
      items: [
        {
          crop: 'キャベツ',
          sowing_week: '2024-W29',
          harvest_week: '2024-W35',
          source: 'テストデータ',
          growth_days: 60,
        },
      ],
    })

    const table = await screen.findByRole('table')
    await within(table).findByText('キャベツ')
    expect(within(table).queryByText('トマト')).toBeNull()

    firstRequest.resolve({
      week: '2024-W30',
      region: 'temperate',
      items: [
        {
          crop: 'トマト',
          sowing_week: '2024-W28',
          harvest_week: '2024-W35',
          source: 'テストデータ',
          growth_days: 70,
        },
      ],
    })

    await waitFor(() => {
      const currentTable = screen.getByRole('table')
      expect(within(currentTable).queryByText('トマト')).toBeNull()
    })
    await within(screen.getByRole('table')).findByText('キャベツ')
  })
})
