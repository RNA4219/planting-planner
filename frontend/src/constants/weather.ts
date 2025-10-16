import type { Region } from '../types'

export interface RegionCoordinates {
  readonly lat: number
  readonly lon: number
}

const REGION_COORDINATES: Record<Region, RegionCoordinates> = {
  cold: { lat: 43.06417, lon: 141.34694 },
  temperate: { lat: 35.6895, lon: 139.6917 },
  warm: { lat: 26.2125, lon: 127.6811 },
}

export const getRegionCoordinates = (region: Region): RegionCoordinates | null => {
  return REGION_COORDINATES[region] ?? null
}
