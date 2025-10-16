import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { fetchWeather, type WeatherResponse } from '../../lib/api'

const CACHE_TTL_MS = 2 * 60 * 60 * 1000
const MIN_BACKOFF_MS = 60_000
const MAX_BACKOFF_MS = 15 * 60 * 1000

const toCacheKey = (lat: number, lon: number): string => `${lat.toFixed(6)}:${lon.toFixed(6)}`

const computeBackoffDelay = (attempts: number): number => {
  const exponent = Math.max(attempts - 1, 0)
  const delay = MIN_BACKOFF_MS * 2 ** exponent
  return Math.min(MAX_BACKOFF_MS, delay)
}

export interface WeatherSnapshot extends WeatherResponse {
  readonly requestId: string
}

interface CacheState {
  latest: WeatherSnapshot | null
  previous: WeatherSnapshot | null
  cachedAt: number | null
  backoffUntil: number | null
  attempts: number
  error: Error | null
}

const ensureCacheEntry = (key: string): CacheState => {
  const existing = CACHE.get(key)
  if (existing) {
    return existing
  }
  const entry: CacheState = {
    latest: null,
    previous: null,
    cachedAt: null,
    backoffUntil: null,
    attempts: 0,
    error: null,
  }
  CACHE.set(key, entry)
  return entry
}

const CACHE = new Map<string, CacheState>()

export const resetWeatherCacheForTests = (): void => {
  CACHE.clear()
}

export interface RefreshOptions {
  readonly force?: boolean
}

export interface UseWeatherParams {
  readonly lat: number | null
  readonly lon: number | null
  readonly enabled?: boolean
}

interface WeatherState {
  readonly latest: WeatherSnapshot | null
  readonly previous: WeatherSnapshot | null
  readonly isLoading: boolean
  readonly error: Error | null
  readonly nextRetryAt: number | null
}

const INITIAL_STATE: WeatherState = {
  latest: null,
  previous: null,
  isLoading: false,
  error: null,
  nextRetryAt: null,
}

export interface UseWeatherResult extends WeatherState {
  readonly refresh: (options?: RefreshOptions) => Promise<WeatherSnapshot | null>
}

export const useWeather = ({
  lat,
  lon,
  enabled = true,
}: UseWeatherParams): UseWeatherResult => {
  const coordinatesAvailable =
    enabled && typeof lat === 'number' && Number.isFinite(lat) && typeof lon === 'number' && Number.isFinite(lon)

  const cacheKey = useMemo(() => {
    if (!coordinatesAvailable) {
      return null
    }
    return toCacheKey(lat as number, lon as number)
  }, [coordinatesAvailable, lat, lon])

  const [state, setState] = useState<WeatherState>(() => INITIAL_STATE)
  const inFlightRef = useRef<Promise<WeatherSnapshot | null> | null>(null)

  const refresh = useCallback(
    async (options?: RefreshOptions): Promise<WeatherSnapshot | null> => {
      if (!coordinatesAvailable || cacheKey === null || lat === null || lon === null) {
        return null
      }

      const entry = ensureCacheEntry(cacheKey)
      const now = Date.now()
      const force = options?.force === true
      const isCacheValid = entry.cachedAt !== null && now - entry.cachedAt < CACHE_TTL_MS

      if (!force) {
        if (entry.error === null && isCacheValid) {
          setState((prev) => ({
            latest: entry.latest ?? prev.latest,
            previous: entry.previous ?? prev.previous,
            isLoading: false,
            error: entry.error,
            nextRetryAt: entry.backoffUntil,
          }))
          return entry.latest
        }
        if (entry.error !== null && entry.backoffUntil !== null && entry.backoffUntil > now) {
          setState((prev) => ({
            latest: entry.latest ?? prev.latest,
            previous: entry.previous ?? prev.previous,
            isLoading: false,
            error: entry.error,
            nextRetryAt: entry.backoffUntil,
          }))
          return entry.latest
        }
        if (inFlightRef.current) {
          return inFlightRef.current
        }
      }

      const execution = (async (): Promise<WeatherSnapshot | null> => {
        setState((prev) => ({
          latest: prev.latest,
          previous: prev.previous,
          isLoading: true,
          error: prev.error,
          nextRetryAt: entry.backoffUntil,
        }))

        try {
          const { weather, requestId } = await fetchWeather(lat, lon)
          const snapshot: WeatherSnapshot = { ...weather, requestId }
          const previous = entry.latest

          entry.previous = previous
          entry.latest = snapshot
          entry.cachedAt = Date.now()
          entry.backoffUntil = null
          entry.attempts = 0
          entry.error = null

          setState({
            latest: entry.latest,
            previous: entry.previous,
            isLoading: false,
            error: null,
            nextRetryAt: null,
          })
          return snapshot
        } catch (rawError) {
          const error = rawError instanceof Error ? rawError : new Error(String(rawError))
          entry.attempts += 1
          entry.backoffUntil = Date.now() + computeBackoffDelay(entry.attempts)
          entry.error = error

          setState((prev) => ({
            latest: entry.latest ?? prev.latest,
            previous: entry.previous ?? prev.previous,
            isLoading: false,
            error,
            nextRetryAt: entry.backoffUntil,
          }))
          return null
        } finally {
          inFlightRef.current = null
        }
      })()

      inFlightRef.current = execution
      return execution
    },
    [cacheKey, coordinatesAvailable, lat, lon],
  )

  useEffect(() => {
    if (!coordinatesAvailable || cacheKey === null) {
      setState(INITIAL_STATE)
      return
    }

    const entry = ensureCacheEntry(cacheKey)
    const now = Date.now()
    const isCacheValid = entry.cachedAt !== null && now - entry.cachedAt < CACHE_TTL_MS

    if (entry.latest && isCacheValid) {
      setState({
        latest: entry.latest,
        previous: entry.previous,
        isLoading: false,
        error: entry.error,
        nextRetryAt: entry.backoffUntil,
      })
      return
    }

    void refresh()
  }, [cacheKey, coordinatesAvailable, refresh])

  return useMemo(
    () => ({
      latest: state.latest,
      previous: state.previous,
      isLoading: state.isLoading,
      error: state.error,
      nextRetryAt: state.nextRetryAt,
      refresh,
    }),
    [refresh, state.error, state.isLoading, state.latest, state.nextRetryAt, state.previous],
  )
}
