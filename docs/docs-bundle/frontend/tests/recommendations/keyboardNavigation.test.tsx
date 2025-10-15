import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, type MockInstance } from 'vitest'

import { fetchCrops, fetchRecommendations, renderApp } from '../utils/renderApp'
import {
  createItem,
  createRecommendResponse,
  defaultCrops,
  setupRecommendationsTest,
} from '../utils/recommendations'

const renderRecommendations = async () => {
  fetchCrops.mockResolvedValue(defaultCrops)
  fetchRecommendations.mockResolvedValue(
    createRecommendResponse({
      items: [
        createItem({
          crop: '春菊',
        }),
      ],
    }),
  )

  const { user } = await renderApp()
  const table = await screen.findByRole('table')
  const rows = within(table).getAllByRole('row')
  const row = rows[1]!
  return {
    user,
    row,
  }
}

describe('App recommendations / キーボード操作', () => {
  let useRecommendationsSpy: MockInstance

  beforeEach(async () => {
    ;({ useRecommendationsSpy } = await setupRecommendationsTest())
  })

  afterEach(() => {
    useRecommendationsSpy.mockRestore()
    cleanup()
  })

  it('Enterキーで行を選択できる', async () => {
    const { user, row } = await renderRecommendations()

    row.focus()
    expect(row).toHaveAttribute('aria-selected', 'false')

    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(row).toHaveAttribute('aria-selected', 'true')
    })
  })

  it('Spaceキーでお気に入りを切り替えできる', async () => {
    const { user, row } = await renderRecommendations()
    const star = within(row).getByRole('button', { name: '春菊をお気に入りに追加' })

    row.focus()
    expect(star).toHaveAttribute('aria-pressed', 'false')

    await user.keyboard(' ')

    const toggled = await within(row).findByRole('button', { name: '春菊をお気に入りから外す' })
    expect(toggled).toHaveAttribute('aria-pressed', 'true')
  })
})
