import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QueryClient, useQueryClient } from '@tanstack/react-query'

import { AppProviders } from './AppProviders'

describe('AppProviders', () => {
  it('QueryClient を提供し、アンマウント時にキャッシュをクリアする', () => {
    let queryClient: QueryClient | undefined
    const Consumer = () => {
      queryClient = useQueryClient()
      queryClient.setQueryData(['test'], 1)
      return null
    }
    const { unmount } = render(
      <AppProviders>
        <Consumer />
      </AppProviders>,
    )
    expect(queryClient?.getQueryData(['test'])).toBe(1)
    unmount()
    expect(queryClient?.getQueryData(['test'])).toBeUndefined()
  })
})
