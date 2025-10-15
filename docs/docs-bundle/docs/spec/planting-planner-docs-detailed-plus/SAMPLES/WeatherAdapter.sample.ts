export interface Daily { date: string; tmax: number; tmin: number; rain: number; wind: number; }
export interface WeatherAdapter {
  getDaily(lat: number, lon: number): Promise<{ daily: Daily[]; fetchedAt: string }>;
}
