import { WIND_KEYS, distanceKm, type Takeoff, type Wind, type WindKey } from './pgearth';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const POINTS_16 = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const;

const STRONG_SPEED_MS = 10;
const STRONG_GUST_MS = 12.5;

export type WindSample = {
  speedMs: number;
  gustMs: number;
  fromDeg: number;
  fromKey: WindKey;
  fromLabel: string;
};

export type HourBar = WindSample & {
  hourLabel: string;
};

export type Flyable = 'good' | 'possible' | 'off' | 'strong';
export type PinMark = 'good' | 'marginal' | 'none';

export type SiteForecast = {
  current: WindSample;
  hours: HourBar[];
  oktas: number;
  temperatureC: number;
  dewPointC: number;
  cape: number | null;
};

export function windKeyFromDeg(deg: number): WindKey {
  const i = Math.round(normalizeDeg(deg) / 45) % WIND_KEYS.length;
  return WIND_KEYS[i] ?? 'N';
}

export function compass16(deg: number): string {
  const i = Math.round(normalizeDeg(deg) / 22.5) % POINTS_16.length;
  return POINTS_16[i] ?? 'N';
}

export function oktasFromCover(percent: number): number {
  return Math.min(8, Math.max(0, Math.round(percent / 12.5)));
}

export function cloudbaseMeters(
  temperatureC: number,
  dewPointC: number,
  takeoffAltitude: number,
): number {
  const spread = Math.max(0, temperatureC - dewPointC);
  return Math.round(takeoffAltitude + spread * 125);
}

export function hourLabel(isoHour: string, currentIso: string): string {
  if (isoHour.slice(0, 13) === currentIso.slice(0, 13)) return 'NOW';
  return isoHour.slice(11, 13);
}

export function windyUrl(lat: number, lng: number): string {
  return `https://www.windy.com/${lat.toFixed(3)}/${lng.toFixed(3)}`;
}

export function flyable(siteWind: Wind, sample: WindSample): Flyable {
  if (sample.speedMs >= STRONG_SPEED_MS || sample.gustMs >= STRONG_GUST_MS) {
    return 'strong';
  }
  const level = siteWind[sample.fromKey];
  switch (level) {
    case 2:
      return 'good';
    case 1:
      return 'possible';
    case 0:
      return 'off';
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function pinMark(wind: Wind, sample: WindSample | null): PinMark {
  let best: 0 | 1 | 2 = 0;
  for (const key of WIND_KEYS) {
    if (wind[key] > best) best = wind[key];
  }
  switch (best) {
    case 0:
      return 'none';
    case 1:
      return 'marginal';
    case 2: {
      if (!sample) return 'good';
      const status = flyable(wind, sample);
      switch (status) {
        case 'good':
          return 'good';
        case 'possible':
        case 'off':
        case 'strong':
          return 'marginal';
        default: {
          const _exhaustive: never = status;
          return _exhaustive;
        }
      }
    }
    default: {
      const _exhaustive: never = best;
      return _exhaustive;
    }
  }
}

export type TakeoffFilters = {
  query: string;
  flyableNow: boolean;
  withinKm: number | null;
  xc: boolean;
  from: { lat: number; lng: number } | null;
  sample: WindSample | null;
};

export function filterTakeoffs(
  sites: Takeoff[],
  filters: TakeoffFilters,
): Takeoff[] {
  const query = filters.query.trim().toLowerCase();
  return sites.filter((site) => {
    if (query && !site.name.toLowerCase().includes(query)) return false;
    if (filters.xc && !site.styles.xc) return false;
    if (filters.withinKm != null && filters.from) {
      const km = distanceKm(filters.from, {
        lat: site.latitude,
        lng: site.longitude,
      });
      if (km > filters.withinKm) return false;
    }
    if (filters.flyableNow && pinMark(site.wind, filters.sample) !== 'good') {
      return false;
    }
    return true;
  });
}

export function parseForecast(raw: unknown): SiteForecast | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const current = asRecord(rec.current);
  if (!current) return null;
  const sample = parseSample(current);
  if (!sample) return null;

  const currentTime =
    typeof current.time === 'string' ? current.time : '';
  const hourly = asRecord(rec.hourly);
  const times = Array.isArray(hourly?.time) ? hourly.time : [];
  const speeds = Array.isArray(hourly?.wind_speed_10m)
    ? hourly.wind_speed_10m
    : [];
  const dirs = Array.isArray(hourly?.wind_direction_10m)
    ? hourly.wind_direction_10m
    : [];
  const gusts = Array.isArray(hourly?.wind_gusts_10m)
    ? hourly.wind_gusts_10m
    : [];

  const hours: HourBar[] = [];
  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    if (typeof time !== 'string') continue;
    const hour = parseSample({
      wind_speed_10m: speeds[i],
      wind_direction_10m: dirs[i],
      wind_gusts_10m: gusts[i],
    });
    if (!hour) continue;
    hours.push({ ...hour, hourLabel: hourLabel(time, currentTime) });
  }

  return {
    current: sample,
    hours,
    oktas: oktasFromCover(num(current.cloud_cover) ?? 0),
    temperatureC: num(current.temperature_2m) ?? 0,
    dewPointC: num(current.dew_point_2m) ?? 0,
    cape: num(current.cape),
  };
}

export async function fetchForecast(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<SiteForecast> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set(
    'current',
    'wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,dew_point_2m,cloud_cover,cape',
  );
  url.searchParams.set(
    'hourly',
    'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
  );
  url.searchParams.set('forecast_hours', '8');
  url.searchParams.set('wind_speed_unit', 'ms');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('cell_selection', 'nearest');

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const forecast = parseForecast(await res.json());
  if (!forecast) throw new Error('Open-Meteo empty forecast');
  return forecast;
}

function parseSample(raw: Record<string, unknown>): WindSample | null {
  const speed = num(raw.wind_speed_10m);
  const fromDeg = num(raw.wind_direction_10m);
  const gust = num(raw.wind_gusts_10m);
  if (speed == null || fromDeg == null) return null;
  return {
    speedMs: roundMs(speed),
    gustMs: roundMs(gust ?? speed),
    fromDeg,
    fromKey: windKeyFromDeg(fromDeg),
    fromLabel: compass16(fromDeg),
  };
}

function roundMs(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function num(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
