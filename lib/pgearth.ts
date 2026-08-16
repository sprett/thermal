export const MIN_TAKEOFF_ZOOM = 8;
export const TAKEOFF_DEBOUNCE_MS = 400;

const PGE_URL =
  'https://www.paraglidingearth.com/api/geojson/getBoundingBoxSites.php';

export const WIND_KEYS = [
  'N',
  'NE',
  'E',
  'SE',
  'S',
  'SW',
  'W',
  'NW',
] as const;

export type WindKey = (typeof WIND_KEYS)[number];
export type WindLevel = 0 | 1 | 2;
export type Wind = Record<WindKey, WindLevel>;

export const FLYING_STYLE_KEYS = [
  'thermals',
  'soaring',
  'xc',
  'flatland',
  'winch',
] as const;

export type FlyingStyleKey = (typeof FLYING_STYLE_KEYS)[number];
export type FlyingStyles = Record<FlyingStyleKey, boolean>;

export type BBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type LatLng = {
  lat: number;
  lng: number;
};

export type Landing = LatLng & {
  altitude: number | null;
  name: string | null;
  description: string | null;
};

export type Takeoff = {
  id: string;
  name: string;
  altitude: number;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  description: string | null;
  flightRules: string | null;
  goingThere: string | null;
  comments: string | null;
  weatherNotes: string | null;
  pgeLink: string | null;
  parking: LatLng | null;
  landing: Landing | null;
  styles: FlyingStyles;
  wind: Wind;
};

export type TakeoffFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: string;
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { id: string };
  }>;
};

export type LoadAction = 'fetch' | 'keep' | 'clear';

type PgeCollection = {
  type?: string;
  features?: unknown[];
};

function num(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function windLevel(value: unknown): WindLevel {
  const n = num(value);
  if (n === 1 || n === 2) return n;
  return 0;
}

function isParagliding(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function flag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\r\n/g, '\n').trim();
  return trimmed || null;
}

function countryCode(value: unknown): string | null {
  const code = text(value);
  return code ? code.toUpperCase() : null;
}

function httpsUrl(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  return raw.replace(/^http:\/\//i, 'https://');
}

function latLng(lat: unknown, lng: unknown): LatLng | null {
  const parsedLat = num(lat);
  const parsedLng = num(lng);
  if (parsedLat == null || parsedLng == null) return null;
  return { lat: parsedLat, lng: parsedLng };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseLanding(props: Record<string, unknown>): Landing | null {
  const nested = asRecord(props.landing);
  const coords =
    latLng(nested?.landing_lat, nested?.landing_lng) ??
    latLng(props.landing_lat, props.landing_lng);
  if (!coords) return null;

  const altitudeRaw = num(nested?.landing_altitude) ?? num(props.landing_altitude);
  const altitude =
    altitudeRaw == null || altitudeRaw === -32768 ? null : Math.round(altitudeRaw);

  return {
    ...coords,
    altitude,
    name: text(nested?.landing_name) ?? text(props.landing_name),
    description:
      text(nested?.landing_description) ?? text(props.landing_description),
  };
}

export function bboxFromLngLatBounds(
  bounds: [west: number, south: number, east: number, north: number],
): BBox {
  const [west, south, east, north] = bounds;
  return { west, south, east, north };
}

export function bboxContains(outer: BBox, inner: BBox): boolean {
  return (
    inner.west >= outer.west &&
    inner.east <= outer.east &&
    inner.south >= outer.south &&
    inner.north <= outer.north
  );
}

export function shouldLoadTakeoffs(
  zoom: number,
  view: BBox,
  loaded: BBox | null,
): LoadAction {
  if (zoom < MIN_TAKEOFF_ZOOM) return 'clear';
  if (loaded && bboxContains(loaded, view)) return 'keep';
  return 'fetch';
}

function suitable(wind: Wind, key: WindKey): boolean {
  return wind[key] >= 1;
}

/** Longest consecutive 0-indexed run of suitable directions, wrapping around. */
export function launchWindow(
  wind: Wind,
): { start: number; length: number } | null {
  const n = WIND_KEYS.length;
  const active = WIND_KEYS.map((key) => suitable(wind, key));
  if (!active.some(Boolean)) return null;

  let bestStart = 0;
  let bestLen = 0;
  for (let start = 0; start < n; start++) {
    if (!active[start] || active[(start + n - 1) % n]) continue;
    let length = 0;
    while (active[(start + length) % n] && length < n) length++;
    if (length > bestLen) {
      bestStart = start;
      bestLen = length;
    }
  }
  if (bestLen === 0) {
    return { start: 0, length: n };
  }
  return { start: bestStart, length: bestLen };
}

export function launchWindowLabel(wind: Wind): string | null {
  const window = launchWindow(wind);
  if (!window) return null;
  if (window.length === WIND_KEYS.length) return 'All';
  const start = WIND_KEYS[window.start];
  const end = WIND_KEYS[(window.start + window.length - 1) % WIND_KEYS.length];
  if (!start || !end || window.length === 1) return start ?? null;
  return `${start} — ${end}`;
}

export function primaryAspect(wind: Wind): WindKey | null {
  const window = launchWindow(wind);
  if (!window) return null;
  for (let i = 0; i < window.length; i++) {
    const key = WIND_KEYS[(window.start + i) % WIND_KEYS.length];
    if (key && wind[key] === 2) return key;
  }
  return WIND_KEYS[window.start] ?? null;
}

export function dropMeters(
  takeoffAltitude: number,
  landingAltitude: number | null,
): number | null {
  if (landingAltitude == null) return null;
  return takeoffAltitude - landingAltitude;
}

export function distanceKm(from: LatLng, to: LatLng): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(to.lat - from.lat);
  const dLng = rad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function flyingStyleLabels(styles: FlyingStyles): string[] {
  const labels: Record<FlyingStyleKey, string> = {
    thermals: 'Thermals',
    soaring: 'Soaring',
    xc: 'XC',
    flatland: 'Flatland',
    winch: 'Winch',
  };
  return FLYING_STYLE_KEYS.filter((key) => styles[key]).map((key) => labels[key]);
}

export function parseTakeoffs(raw: unknown): Takeoff[] {
  const collection = asRecord(raw) as PgeCollection | null;
  if (!collection || !Array.isArray(collection.features)) return [];

  const sites: Takeoff[] = [];
  for (const feature of collection.features) {
    const rec = asRecord(feature);
    if (!rec) continue;
    const geometry = asRecord(rec.geometry);
    const props = asRecord(rec.properties);
    if (!geometry || !props) continue;
    if (geometry.type !== 'Point') continue;
    if (!isParagliding(props.paragliding)) continue;

    const coords = geometry.coordinates;
    if (
      !Array.isArray(coords) ||
      typeof coords[0] !== 'number' ||
      typeof coords[1] !== 'number'
    ) {
      continue;
    }

    const id = props.pge_site_id;
    if (id == null || id === '') continue;

    const wind = {} as Wind;
    for (const key of WIND_KEYS) {
      wind[key] = windLevel(props[key]);
    }

    const altitudeRaw = num(props.takeoff_altitude);
    const altitude =
      altitudeRaw == null || altitudeRaw === -32768 ? 0 : Math.round(altitudeRaw);

    const styles = {} as FlyingStyles;
    for (const key of FLYING_STYLE_KEYS) {
      styles[key] = flag(props[key]);
    }

    sites.push({
      id: String(id),
      name: typeof props.name === 'string' && props.name ? props.name : 'Takeoff',
      altitude,
      longitude: coords[0],
      latitude: coords[1],
      countryCode: countryCode(props.countryCode),
      description: text(props.takeoff_description),
      flightRules: text(props.flight_rules),
      goingThere: text(props.going_there),
      comments: text(props.comments),
      weatherNotes: text(props.weather),
      pgeLink: httpsUrl(props.pge_link),
      parking: latLng(props.takeoff_parking_lat, props.takeoff_parking_lng),
      landing: parseLanding(props),
      styles,
      wind,
    });
  }
  return sites;
}

export function takeoffsToGeoJSON(
  takeoffs: Takeoff[],
): TakeoffFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: takeoffs.map((site) => ({
      type: 'Feature',
      id: site.id,
      geometry: {
        type: 'Point',
        coordinates: [site.longitude, site.latitude],
      },
      properties: { id: site.id },
    })),
  };
}

export async function fetchTakeoffs(
  bbox: BBox,
  signal?: AbortSignal,
): Promise<Takeoff[]> {
  const url = new URL(PGE_URL);
  url.searchParams.set('south', String(bbox.south));
  url.searchParams.set('north', String(bbox.north));
  url.searchParams.set('west', String(bbox.west));
  url.searchParams.set('east', String(bbox.east));
  url.searchParams.set('style', 'detailled');

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`ParaglidingEarth ${res.status}`);
  }
  return parseTakeoffs(await res.json());
}
