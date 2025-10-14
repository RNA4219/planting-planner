import type { ReactNode } from 'react'

type AppScreenProps = {
  title: string
  searchControls: ReactNode
  toastStack: ReactNode
  recommendationsTable: ReactNode
  priceChartSection: ReactNode
  fallbackNotice?: ReactNode | null
}

export const AppScreen = ({
  title,
  searchControls,
  toastStack,
  recommendationsTable,
  priceChartSection,
  fallbackNotice = null,
}: AppScreenProps) => {
  return (
    <div className="min-h-screen bg-market-neutral-container">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="space-y-6 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg backdrop-blur">
          <h1 className="text-3xl font-bold tracking-tight text-market-neutral-strong sm:text-4xl">
            {title}
          </h1>
          {searchControls}
        </header>
        <main className="flex flex-1 flex-col gap-8 pb-12">
          {toastStack}
          {fallbackNotice}
          {recommendationsTable}
          {priceChartSection}
        </main>
      </div>
    </div>
  )
}
