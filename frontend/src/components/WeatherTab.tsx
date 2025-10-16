import { useId } from 'react'

import { WEATHER_MESSAGES } from '../constants/messages'
import type { WeatherSnapshot } from '../hooks/weather/useWeather'

const numberFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 1,
})

const formatTemperature = (value: number): string => `${numberFormatter.format(value)}℃`
const formatRain = (value: number): string => `${numberFormatter.format(value)}mm`
const formatWind = (value: number): string => `${numberFormatter.format(value)}m/s`

const formatFetchedAt = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('ja-JP', { hour12: false })
}

interface WeatherTabProps {
  readonly latest: WeatherSnapshot | null
  readonly previous: WeatherSnapshot | null
  readonly isLoading: boolean
  readonly error: Error | null
}

const renderDaily = (
  label: string,
  testId: string,
  entry: WeatherSnapshot | null,
  comparison: WeatherSnapshot | null,
) => {
  const primaryDay = entry?.daily?.[0] ?? null
  const secondaryDay = comparison?.daily?.[0] ?? null

  if (!primaryDay && !secondaryDay) {
    return (
      <article
        data-testid={testId}
        className="rounded-2xl border border-market-neutral/30 bg-white/80 p-4 shadow-sm"
      >
        <h3 className="text-lg font-semibold text-market-neutral-strong">{label}</h3>
        <p className="mt-3 text-sm text-market-neutral/70">{WEATHER_MESSAGES.empty}</p>
      </article>
    )
  }

  const day = primaryDay ?? secondaryDay

  return (
    <article
      data-testid={testId}
      className="rounded-2xl border border-market-neutral/30 bg-white/80 p-4 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-market-neutral-strong">{label}</h3>
      {day ? (
        <>
          <p className="mt-2 text-sm font-medium text-market-neutral/80">{day.date}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-market-neutral-strong">
            <div>
              <dt className="font-medium text-market-neutral/80">{WEATHER_MESSAGES.metrics.tmax}</dt>
              <dd className="mt-1 text-base font-semibold">{formatTemperature(day.tmax)}</dd>
            </div>
            <div>
              <dt className="font-medium text-market-neutral/80">{WEATHER_MESSAGES.metrics.tmin}</dt>
              <dd className="mt-1 text-base font-semibold">{formatTemperature(day.tmin)}</dd>
            </div>
            <div>
              <dt className="font-medium text-market-neutral/80">{WEATHER_MESSAGES.metrics.rain}</dt>
              <dd className="mt-1 text-base font-semibold">{formatRain(day.rain)}</dd>
            </div>
            <div>
              <dt className="font-medium text-market-neutral/80">{WEATHER_MESSAGES.metrics.wind}</dt>
              <dd className="mt-1 text-base font-semibold">{formatWind(day.wind)}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="mt-3 text-sm text-market-neutral/70">{WEATHER_MESSAGES.empty}</p>
      )}
    </article>
  )
}

export const WeatherTab = ({ latest, previous, isLoading, error }: WeatherTabProps) => {
  const headingId = useId()
  const sectionId = `${headingId}-section`
  const hasPrimaryDaily = Boolean(latest?.daily?.[0])
  const trimmedLatest: WeatherSnapshot | null =
    hasPrimaryDaily && latest
      ? { ...latest, daily: latest.daily.slice(1) as WeatherSnapshot['daily'] }
      : null

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-6 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg backdrop-blur"
      id={sectionId}
      role="region"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 id={headingId} className="text-2xl font-bold text-market-neutral-strong">
          {WEATHER_MESSAGES.title}
        </h2>
        {latest?.fetchedAt ? (
          <p className="text-sm text-market-neutral/70">
            {WEATHER_MESSAGES.updatedAt(formatFetchedAt(latest.fetchedAt))}
          </p>
        ) : null}
      </div>
      {isLoading ? (
        <p className="text-sm text-market-neutral/70">{WEATHER_MESSAGES.loading}</p>
      ) : null}
      {error ? (
        <p className="text-sm font-semibold text-market-warning" role="alert">
          {WEATHER_MESSAGES.error}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {renderDaily(
          WEATHER_MESSAGES.latestLabel,
          'weather-latest',
          latest,
          hasPrimaryDaily ? null : previous,
        )}
        {renderDaily(
          WEATHER_MESSAGES.previousLabel,
          'weather-previous',
          trimmedLatest ?? previous,
          previous,
        )}
      </div>
    </section>
  )
}
