import type { PropsWithChildren } from 'react'
import { useEffect, useMemo } from 'react'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'

const createQueryClient = () => new QueryClient({ queryCache: new QueryCache() })

export const AppProviders = ({ children }: PropsWithChildren): JSX.Element => {
  const queryClient = useMemo(() => createQueryClient(), [])

  useEffect(() => {
    return () => {
      queryClient.clear()
    }
  }, [queryClient])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export default AppProviders
