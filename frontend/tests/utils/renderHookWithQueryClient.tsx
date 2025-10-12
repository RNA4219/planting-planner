import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type {
  RenderHookOptions,
  RenderHookResult,
} from '@testing-library/react'
import { afterEach } from 'vitest'

export function renderHookWithQueryClient<Result, Props>(
  callback: (props: Props) => Result,
  options?: RenderHookOptions<Props>,
): RenderHookResult<Result, Props> {
  const queryClient = new QueryClient()
  const { wrapper: optionsWrapper, ...restOptions } = options ?? {}
  const ProvidedWrapper = optionsWrapper

  const Wrapper = ({ children }: { children?: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {ProvidedWrapper ? <ProvidedWrapper>{children}</ProvidedWrapper> : children}
    </QueryClientProvider>
  )

  const result = renderHook(callback, {
    ...restOptions,
    wrapper: Wrapper,
  })

  afterEach(() => {
    queryClient.clear()
  })

  return result
}
