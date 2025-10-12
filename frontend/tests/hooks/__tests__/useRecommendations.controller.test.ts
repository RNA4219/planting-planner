import '@testing-library/jest-dom/vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FormEvent } from 'react'

import {
  recommendationControllerMocks,
  resetRecommendationControllerMocks,
} from '../../utils/recommendations'
import { useRecommendations } from '../../../src/hooks/useRecommendations'

describe('hooks / useRecommendations controller', () => {
  const { fetcherMock } = recommendationControllerMocks

  beforeEach(() => {
    resetRecommendationControllerMocks()
  })

  it('updates region via handleSubmit and requests override region', async () => {
    fetcherMock.mockResolvedValue({ week: '2024-W30', items: [] })
    const { result } = renderHook(() =>
      useRecommendations({ favorites: [], initialRegion: 'temperate' }),
    )

    await waitFor(() => {
      expect(fetcherMock).toHaveBeenCalled()
    })
    fetcherMock.mockClear()
    fetcherMock.mockResolvedValue({ week: '2024-W32', items: [] })

    const event = {
      preventDefault: () => {},
      currentTarget: {
        elements: {
          namedItem: (name: string) => {
            if (name === 'week') {
              return { value: '2024-W31' }
            }
            if (name === 'region') {
              return { value: 'warm' }
            }
            return null
          },
        },
      },
    } as unknown as FormEvent<HTMLFormElement>

    await act(async () => {
      await result.current.handleSubmit(event)
    })

    expect(result.current.region).toBe('warm')
    expect(fetcherMock).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'warm', week: '2024-W31' }),
    )
  })
})
