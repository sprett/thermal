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

export type BBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type Takeoff = {
  id: string;
  name: string;
  altitude: number;
  latitude: number;
  longitude: number;
  landing: { lat: number; lng: number } | null;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
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

    const lat = num(props.landing_lat);
    const lng = num(props.landing_lng);

    const altitudeRaw = num(props.takeoff_altitude);
    const altitude =
      altitudeRaw == null || altitudeRaw === -32768 ? 0 : Math.round(altitudeRaw);

    sites.push({
      id: String(id),
      name: typeof props.name === 'string' && props.name ? props.name : 'Takeoff',
      altitude,
      longitude: coords[0],
      latitude: coords[1],
      landing: lat != null && lng != null ? { lat, lng } : null,
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
