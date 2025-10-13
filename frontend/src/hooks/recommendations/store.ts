import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { CropCategory, MarketScope, Region } from '../../types'

export interface RecommendationPreferencesState {
  region: Region
  selectedMarket: MarketScope
  selectedCategory: CropCategory
}

export interface RecommendationPreferencesActions {
  setRegion: (region: Region) => void
  setSelectedMarket: (market: MarketScope) => void
  setSelectedCategory: (category: CropCategory) => void
}

export type RecommendationPreferencesStore = RecommendationPreferencesState & RecommendationPreferencesActions

export const RECOMMENDATION_PREFERENCES_KEY = 'plantingPlanner.recommendations.preferences'

export const DEFAULT_RECOMMENDATION_PREFERENCES: RecommendationPreferencesState = {
  region: 'temperate',
  selectedMarket: 'national',
  selectedCategory: 'leaf',
}

const isRegion = (value: unknown): value is Region => value === 'cold' || value === 'temperate' || value === 'warm'

const isMarketScope = (value: unknown): value is MarketScope =>
  value === 'national' ||
  (typeof value === 'string' && value.startsWith('city:') && value.length > 'city:'.length)

const isCropCategory = (value: unknown): value is CropCategory => value === 'leaf' || value === 'root' || value === 'flower'

const sanitizePreferences = (value: unknown): RecommendationPreferencesState => {
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_RECOMMENDATION_PREFERENCES }
  }
  const raw = value as Partial<Record<keyof RecommendationPreferencesState, unknown>>
  return {
    region: isRegion(raw.region) ? raw.region : DEFAULT_RECOMMENDATION_PREFERENCES.region,
    selectedMarket: isMarketScope(raw.selectedMarket)
      ? raw.selectedMarket
      : DEFAULT_RECOMMENDATION_PREFERENCES.selectedMarket,
    selectedCategory: isCropCategory(raw.selectedCategory)
      ? raw.selectedCategory
      : DEFAULT_RECOMMENDATION_PREFERENCES.selectedCategory,
  }
}

export const useRecommendationStore = create<RecommendationPreferencesStore>()(
  persist(
    (set) => ({
      ...DEFAULT_RECOMMENDATION_PREFERENCES,
      setRegion: (region) =>
        set((state) => (state.region === region ? state : { ...state, region }), false),
      setSelectedMarket: (market) =>
        set(
          (state) => (state.selectedMarket === market ? state : { ...state, selectedMarket: market }),
          false,
        ),
      setSelectedCategory: (category) =>
        set(
          (state) =>
            state.selectedCategory === category ? state : { ...state, selectedCategory: category },
          false,
        ),
    }),
    {
      name: RECOMMENDATION_PREFERENCES_KEY,
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined' || !window.localStorage) {
          return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
        }
        return window.localStorage
      }),
      version: 1,
      merge: (persistedState, currentState) => {
        const rawState =
          typeof persistedState === 'object' && persistedState !== null && 'state' in persistedState
            ? (persistedState as { state?: unknown }).state
            : persistedState
        const sanitized = sanitizePreferences(rawState)
        return { ...currentState, ...sanitized }
      },
      partialize: (state) => ({
        region: state.region,
        selectedMarket: state.selectedMarket,
        selectedCategory: state.selectedCategory,
      }),
    },
  ),
)
