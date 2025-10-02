import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchCrops,
  fetchRecommend,
  fetchRefreshStatus,
  fetchRecommendations,
  postRefresh,
  renderApp,
  resetAppSpies,
} from '../tests/utils/renderApp'

describe('App refresh', () => {
  beforeEach(() => {
    resetAppSpies()
    fetchRecommend.mockRejectedValue(new Error('legacy endpoint disabled'))
  })

  afterEach(() => {
    cleanup()
  })

  it('更新ボタンでメッセージが表示され alert を使わない', async () => {
    fetchCrops.mockResolvedValue([
      { id: 1, name: '春菊', category: 'leaf' },
      { id: 2, name: 'にんじん', category: 'root' },
    ])
    fetchRecommendations.mockResolvedValue({
      week: '2024-W30',
      region: 'temperate',
      items: [
        {
          crop: '春菊',
          harvest_week: '2024-W35',
          sowing_week: '2024-W30',
          source: 'local-db',
          growth_days: 35,
        },
      ],
    })

    const { user } = await renderApp()

    const refreshButton = screen.getByRole('button', { name: '更新' })
    const main = screen.getByRole('main')
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined)

    fetchRefreshStatus.mockResolvedValue({
      state: 'success',
      started_at: null,
      finished_at: null,
      updated_records: 1,
      last_error: null,
    })
    let resolveRefresh: (() => void) | undefined
    let rejectRefresh: (() => void) | undefined
    postRefresh.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = () =>
            resolve({
              state: 'success',
            })
        }),
    )
    postRefresh.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectRefresh = () => reject(new Error('network'))
        }),
    )

    try {
      await user.click(refreshButton)
      expect(refreshButton).toBeDisabled()

      resolveRefresh?.()

      await expect(
        waitFor(() => {
          expect(
            within(main).getByText('更新リクエストを受け付けました。自動ステータス更新は未実装です。'),
          ).toBeInTheDocument()
        }),
      ).resolves.toBeUndefined()

      await new Promise((resolve) => {
        setTimeout(resolve, 1600)
      })

      expect(fetchRefreshStatus).not.toHaveBeenCalled()
      expect(alertSpy).not.toHaveBeenCalled()
      await waitFor(() => expect(refreshButton).not.toBeDisabled())

      await user.click(refreshButton)
      expect(refreshButton).toBeDisabled()

      rejectRefresh?.()

      await expect(
        waitFor(() => {
          expect(
            within(main).getByText('更新リクエストに失敗しました。自動ステータス更新は未実装です。'),
          ).toBeInTheDocument()
        }),
      ).resolves.toBeUndefined()
      expect(alertSpy).not.toHaveBeenCalled()
      await waitFor(() => expect(refreshButton).not.toBeDisabled())
    } finally {
      alertSpy.mockRestore()
    }
  })
})
