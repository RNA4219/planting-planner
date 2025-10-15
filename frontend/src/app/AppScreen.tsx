import type { ReactNode } from 'react'

import { APP_STATUS_MESSAGES } from '../constants/messages'
import { formatLastSync } from '../utils/formatLastSync'

type AppScreenProps = {
  title: string
  searchControls: ReactNode
  toastStack: ReactNode
  recommendationsTable: ReactNode
  priceChartSection: ReactNode
  fallbackNotice?: ReactNode | null
  offlineBanner?: ReactNode | null
  status: {
    readonly isOffline: boolean
    readonly lastSync: Date | null
  }
  appVersion: string
}

export const AppScreen = ({
  title,
  searchControls,
  toastStack,
  recommendationsTable,
  priceChartSection,
  fallbackNotice = null,
  offlineBanner = null,
  status,
  appVersion,
}: AppScreenProps) => {
  const formattedLastSync = formatLastSync(
    status.lastSync,
    APP_STATUS_MESSAGES.statusLastSyncUnknown,
  )
  const lastSyncLabel = `${APP_STATUS_MESSAGES.statusLastSyncPrefix}${formattedLastSync}`
  const statusLabel = status.isOffline
    ? APP_STATUS_MESSAGES.statusOffline
    : APP_STATUS_MESSAGES.statusOnline

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
          <div
            data-testid="app-status-bar"
            className="flex flex-col gap-1 rounded-2xl border border-market-neutral/40 bg-white/90 px-4 py-3 text-sm text-market-neutral-strong shadow-sm sm:flex-row sm:items-center sm:justify-between"
            role="status"
            aria-live="polite"
          >
            <span className="font-semibold">{statusLabel}</span>
            <span>{lastSyncLabel}</span>
          </div>
          {offlineBanner}
          {fallbackNotice}
          {recommendationsTable}
          {priceChartSection}
        </main>
        <footer className="border-t border-white/40 pt-4 text-sm text-market-neutral/80">
          <span data-testid="app-version-footer">
            {APP_STATUS_MESSAGES.versionLabel(appVersion)}
          </span>
        </footer>
      </div>
    </div>
  )
}
