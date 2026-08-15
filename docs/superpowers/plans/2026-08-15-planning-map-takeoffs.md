# Planning Map Takeoffs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plot ParaglidingEarth takeoffs as quiet navy dots on the Fly-tab planning map, following the viewport, with a glass identity sheet on tap.

**Architecture:** Pure PGE client in `lib/pgearth.ts` (fetch, coerce strings, bbox policy). `useTakeoffSites` debounces `onRegionDidChange`, aborts stale requests, and keeps the last good list. `TakeoffLayer` is a MapLibre `GeoJSONSource` + circle `Layer`. `SiteSheet` is a Gorhom sheet; the Fly CTA may sit behind it. Nothing is added to `app/fly.tsx`.

**Tech Stack:** Expo SDK 57, MapLibre React Native 11 (`GeoJSONSource`, `Layer`, `MapRef`), `@gorhom/bottom-sheet`, `react-native-svg`, PGE HTTPS GeoJSON. Tests: Node `tsx --test` on pure lib code. UI: `npm run typecheck` plus the manual checklist.

**Spec:** `docs/superpowers/specs/2026-08-15-planning-map-takeoffs-design.md`

---

## File map

| File | Role |
|---|---|
| `lib/pgearth.ts` | Types, parse, bbox, `shouldLoadTakeoffs`, `fetchTakeoffs`, `takeoffsToGeoJSON` |
| `lib/pgearth.test.ts` | Unit tests for the above (excluded from `tsc`) |
| `hooks/useTakeoffSites.ts` | Debounce, abort, last-good state |
| `components/sites/WindRose.tsx` | Eight-tick rose |
| `components/sites/SiteSheet.tsx` | Glass sheet |
| `components/sites/TakeoffLayer.tsx` | Circles + press |
| `app/(tabs)/index.tsx` | Wire map, sheet, attribution |
| `package.json` | `test` script + `tsx` devDependency |
| `tsconfig.json` | Exclude `**/*.test.ts` |

Do not modify `app/fly.tsx`.

---

### Task 1: PGE client + viewport policy

**Files:**
- Create: `lib/pgearth.ts`
- Create: `lib/pgearth.test.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: Add the test runner and exclude tests from `tsc`**

In `package.json`, add `"tsx": "^4.20.5"` to `devDependencies` and a script:

```json
"test": "tsx --test lib/pgearth.test.ts"
```

In `tsconfig.json`, add:

```json
"exclude": ["**/*.test.ts"]
```

Run: `npm install`

Expected: `tsx` listed in `node_modules`, lockfile updated.

- [ ] **Step 2: Write the failing tests**

Create `lib/pgearth.test.ts`:

```ts
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  bboxContains,
  bboxFromLngLatBounds,
  fetchTakeoffs,
  parseTakeoffs,
  shouldLoadTakeoffs,
  takeoffsToGeoJSON,
  MIN_TAKEOFF_ZOOM,
  type BBox,
} from './pgearth';

const pgeFeature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [6.54287, 60.6432] },
  properties: {
    name: 'Bjørnestigen',
    pge_site_id: 123,
    takeoff_altitude: '560',
    paragliding: '1',
    hanggliding: '0',
    landing_lat: '',
    landing_lng: '',
    N: '0',
    NE: '0',
    E: '0',
    SE: '0',
    S: '0',
    SW: '0',
    W: '2',
    NW: '0',
  },
};

test('parseTakeoffs keeps paragliding takeoffs and coerces strings', () => {
  const sites = parseTakeoffs({
    type: 'FeatureCollection',
    features: [pgeFeature],
  });
  assert.equal(sites.length, 1);
  assert.deepEqual(sites[0], {
    id: '123',
    name: 'Bjørnestigen',
    altitude: 560,
    latitude: 60.6432,
    longitude: 6.54287,
    landing: null,
    wind: { N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 2, NW: 0 },
  });
});

test('parseTakeoffs drops hang-gliding-only sites', () => {
  const sites = parseTakeoffs({
    type: 'FeatureCollection',
    features: [
      {
        ...pgeFeature,
        properties: { ...pgeFeature.properties, paragliding: '0' },
      },
    ],
  });
  assert.equal(sites.length, 0);
});

test('parseTakeoffs keeps landing coords and skips empty strings', () => {
  const withLanding = parseTakeoffs({
    type: 'FeatureCollection',
    features: [
      {
        ...pgeFeature,
        properties: {
          ...pgeFeature.properties,
          landing_lat: '60.61',
          landing_lng: '6.41',
        },
      },
    ],
  });
  assert.deepEqual(withLanding[0]?.landing, { lat: 60.61, lng: 6.41 });
});

test('bboxContains is inclusive on the inner box', () => {
  const outer: BBox = { west: 6, south: 60, east: 7, north: 61 };
  assert.equal(bboxContains(outer, outer), true);
  assert.equal(
    bboxContains(outer, { west: 6.2, south: 60.2, east: 6.8, north: 60.8 }),
    true,
  );
  assert.equal(
    bboxContains(outer, { west: 5.9, south: 60, east: 7, north: 61 }),
    false,
  );
});

test('bboxFromLngLatBounds uses MapLibre west-south-east-north order', () => {
  assert.deepEqual(bboxFromLngLatBounds([6, 60, 7, 61]), {
    west: 6,
    south: 60,
    east: 7,
    north: 61,
  });
});

test('shouldLoadTakeoffs clears below min zoom and skips contained pans', () => {
  const loaded: BBox = { west: 6, south: 60, east: 7, north: 61 };
  const inner: BBox = { west: 6.2, south: 60.2, east: 6.8, north: 60.8 };
  assert.equal(MIN_TAKEOFF_ZOOM, 8);
  assert.equal(shouldLoadTakeoffs(7.9, inner, loaded), 'clear');
  assert.equal(shouldLoadTakeoffs(8, inner, loaded), 'keep');
  assert.equal(shouldLoadTakeoffs(10, inner, null), 'fetch');
  assert.equal(
    shouldLoadTakeoffs(10, { west: 5, south: 60, east: 7, north: 61 }, loaded),
    'fetch',
  );
});

test('takeoffsToGeoJSON only puts id on properties', () => {
  const sites = parseTakeoffs({
    type: 'FeatureCollection',
    features: [pgeFeature],
  });
  const geo = takeoffsToGeoJSON(sites);
  assert.equal(geo.features[0]?.id, '123');
  assert.deepEqual(geo.features[0]?.properties, { id: '123' });
  assert.deepEqual(geo.features[0]?.geometry.coordinates, [6.54287, 60.6432]);
});

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('fetchTakeoffs hits HTTPS detailled bbox and parses the body', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input));
    return new Response(
      JSON.stringify({ type: 'FeatureCollection', features: [pgeFeature] }),
      { status: 200 },
    );
  }) as typeof fetch;

  const sites = await fetchTakeoffs({
    south: 60.5,
    north: 60.8,
    west: 6.2,
    east: 6.6,
  });
  assert.equal(sites[0]?.name, 'Bjørnestigen');
  assert.equal(calls.length, 1);
  const url = new URL(calls[0]!);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname, 'www.paraglidingearth.com');
  assert.equal(url.pathname, '/api/geojson/getBoundingBoxSites.php');
  assert.equal(url.searchParams.get('style'), 'detailled');
  assert.equal(url.searchParams.get('south'), '60.5');
  assert.equal(url.searchParams.get('north'), '60.8');
  assert.equal(url.searchParams.get('west'), '6.2');
  assert.equal(url.searchParams.get('east'), '6.6');
  assert.equal(url.searchParams.has('limit'), false);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`

Expected: FAIL with `Cannot find module './pgearth'` (or `tsx` cannot resolve `./pgearth`).

- [ ] **Step 4: Implement `lib/pgearth.ts`**

```ts
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

    sites.push({
      id: String(id),
      name: typeof props.name === 'string' && props.name ? props.name : 'Takeoff',
      altitude: Math.round(num(props.takeoff_altitude) ?? 0),
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json lib/pgearth.ts lib/pgearth.test.ts
git commit -m "$(cat <<'EOF'
feat(sites): parse ParaglidingEarth takeoffs and viewport fetch policy

Coerce PGE string fields up front and skip refetches that still sit inside the last box.
EOF
)"
```

---

### Task 2: `useTakeoffSites`

**Files:**
- Create: `hooks/useTakeoffSites.ts`

- [ ] **Step 1: Implement the hook**

No extra test file — policy is already covered in Task 1. This file only wires debounce, abort, and last-good state.

Create `hooks/useTakeoffSites.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  TAKEOFF_DEBOUNCE_MS,
  bboxFromLngLatBounds,
  fetchTakeoffs,
  shouldLoadTakeoffs,
  type Takeoff,
} from '../lib/pgearth';

type View = {
  zoom: number;
  bounds: [west: number, south: number, east: number, north: number];
};

export function useTakeoffSites() {
  const [takeoffs, setTakeoffs] = useState<Takeoff[]>([]);
  const loadedBBox = useRef<ReturnType<typeof bboxFromLngLatBounds> | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onViewState = useCallback((view: View) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const bbox = bboxFromLngLatBounds(view.bounds);
      const action = shouldLoadTakeoffs(view.zoom, bbox, loadedBBox.current);

      if (action === 'keep') return;

      abortRef.current?.abort();

      if (action === 'clear') {
        loadedBBox.current = null;
        setTakeoffs([]);
        return;
      }

      const ac = new AbortController();
      abortRef.current = ac;
      fetchTakeoffs(bbox, ac.signal)
        .then((sites) => {
          if (ac.signal.aborted) return;
          loadedBBox.current = bbox;
          setTakeoffs(sites);
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return;
        });
    }, TAKEOFF_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return { takeoffs, onViewState };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: exit 0. If `hooks/` is unused yet, that is fine — the file must typecheck on its own.

- [ ] **Step 3: Commit**

```bash
git add hooks/useTakeoffSites.ts
git commit -m "$(cat <<'EOF'
feat(sites): debounce viewport takeoff fetches and keep last good dots

Abort stale PGE requests; a failed refetch does not clear a successful load.
EOF
)"
```

---

### Task 3: Wind rose

**Files:**
- Create: `components/sites/WindRose.tsx`

- [ ] **Step 1: Implement `WindRose`**

Uses `react-native-svg` (already in `package.json`). Tick colour: `0` faint, `1` muted, `2` brand and thicker.

```tsx
import { Circle, Line, Svg, Text as SvgText } from 'react-native-svg';

import { WIND_KEYS, type Wind, type WindKey } from '../../lib/pgearth';
import { font } from '../../lib/type';

const SIZE = 88;
const CX = SIZE / 2;
const CY = SIZE / 2;
const INNER = 22;
const OUTER = 34;

function tickColor(
  key: WindKey,
  wind: Wind,
  brand: string,
  muted: string,
  faint: string,
): string {
  const level = wind[key];
  if (level === 2) return brand;
  if (level === 1) return muted;
  return faint;
}

function bestKey(wind: Wind): WindKey | null {
  for (const key of WIND_KEYS) {
    if (wind[key] === 2) return key;
  }
  for (const key of WIND_KEYS) {
    if (wind[key] === 1) return key;
  }
  return null;
}

export function WindRose({
  wind,
  brand,
  muted,
  faint,
}: {
  wind: Wind;
  brand: string;
  muted: string;
  faint: string;
}) {
  const label = bestKey(wind);

  return (
    <Svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      accessibilityLabel={
        label ? `Wind good from ${label}` : 'No suitable wind direction'
      }
    >
      <Circle
        cx={CX}
        cy={CY}
        r={OUTER + 2}
        fill="none"
        stroke={faint}
        strokeWidth={1}
      />
      {WIND_KEYS.map((key, i) => {
        const rad = ((i * 45 - 90) * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const good = wind[key] === 2;
        return (
          <Line
            key={key}
            x1={CX + cos * INNER}
            y1={CY + sin * INNER}
            x2={CX + cos * OUTER}
            y2={CY + sin * OUTER}
            stroke={tickColor(key, wind, brand, muted, faint)}
            strokeWidth={good ? 5 : 3}
            strokeLinecap="round"
          />
        );
      })}
      {label ? (
        <SvgText
          x={CX}
          y={CY + 4}
          textAnchor="middle"
          fontFamily={font.sansSemibold}
          fontSize={11}
          fill={muted}
        >
          {label}
        </SvgText>
      ) : null}
    </Svg>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/sites/WindRose.tsx
git commit -m "$(cat <<'EOF'
feat(sites): eight-tick wind rose for PGE orientations

Map 0/1/2 onto faint, muted, and brand ticks so a takeoff reads at a glance.
EOF
)"
```

---

### Task 4: Site sheet

**Files:**
- Create: `components/sites/SiteSheet.tsx`

- [ ] **Step 1: Implement `SiteSheet`**

Mirror `components/hud/ReadoutSheet.tsx`: Gorhom + `GlassSurface` background. Unmount when `site` is null so the Fly button is visible again. Pan-down-to-close calls `onClose`. Fly is allowed to sit behind this sheet.

```tsx
import BottomSheet, {
  BottomSheetView,
  type BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Takeoff } from '../../lib/pgearth';
import { useThemeColors } from '../../lib/theme';
import { LABEL, font } from '../../lib/type';
import { GlassSurface } from '../glass/GlassSurface';
import { WindRose } from './WindRose';

export function SiteSheet({
  site,
  bottomInset = 0,
  onClose,
}: {
  site: Takeoff | null;
  bottomInset?: number;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  if (!site) return null;

  return (
    <BottomSheet
      index={0}
      enableDynamicSizing
      enablePanDownToClose
      enableOverDrag={false}
      onClose={onClose}
      backgroundComponent={SheetBackground}
      backgroundStyle={{ backgroundColor: 'transparent', borderRadius: 28 }}
      handleIndicatorStyle={{
        width: 36,
        height: 4,
        backgroundColor: colors.inkFaint,
        opacity: 0.4,
      }}
    >
      <BottomSheetView>
        <View className="px-5 pt-1" style={{ paddingBottom: bottomInset + 16 }}>
          <View className="flex-row items-start justify-between">
            <View className="mr-4 flex-1">
              <Text style={LABEL} className="mb-1 text-ink-faint">
                Takeoff
              </Text>
              <Text
                style={{ fontFamily: font.sansSemibold, fontSize: 22 }}
                className="text-ink"
              >
                {site.name}
              </Text>
            </View>
            <View className="items-end">
              <Text style={LABEL} className="mb-1 text-ink-faint">
                Alt m
              </Text>
              <Text
                style={{ fontFamily: font.monoSemibold, fontSize: 22 }}
                className="text-ink"
              >
                {site.altitude}
              </Text>
            </View>
          </View>

          <View className="items-center py-3">
            <WindRose
              wind={site.wind}
              brand={colors.brand}
              muted={colors.inkMuted}
              faint={colors.inkFaint}
            />
          </View>

          {site.landing ? (
            <Text
              style={{ fontFamily: font.sans, fontSize: 14 }}
              className="text-ink-muted"
            >
              Landing recorded
            </Text>
          ) : null}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

function SheetBackground({ style }: BottomSheetBackgroundProps) {
  return (
    <Animated.View style={[style, { overflow: 'hidden' }]} pointerEvents="none">
      <GlassSurface
        className="absolute inset-0 overflow-hidden"
        glassStyle="regular"
        borderRadius={28}
      />
    </Animated.View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/sites/SiteSheet.tsx
git commit -m "$(cat <<'EOF'
feat(sites): glass takeoff sheet with name, altitude, and wind

Show a landing line only when PGE sent coordinates; omit weather for this slice.
EOF
)"
```

---

### Task 5: Takeoff layer

**Files:**
- Create: `components/sites/TakeoffLayer.tsx`

- [ ] **Step 1: Implement `TakeoffLayer`**

Must live **inside** `<Map>`. `onPress` calls `stopPropagation` so Map’s `onPress` does not immediately clear the selection. Selected id gets a larger circle via a data-driven `circle-radius`.

```tsx
import {
  GeoJSONSource,
  Layer,
  type PressEventWithFeatures,
} from '@maplibre/maplibre-react-native';
import type { NativeSyntheticEvent } from 'react-native';

import { takeoffsToGeoJSON, type Takeoff } from '../../lib/pgearth';

export function TakeoffLayer({
  takeoffs,
  selectedId,
  brand,
  paper,
  onSelect,
}: {
  takeoffs: Takeoff[];
  selectedId: string | null;
  brand: string;
  paper: string;
  onSelect: (id: string) => void;
}) {
  const data = takeoffsToGeoJSON(takeoffs);

  return (
    <GeoJSONSource
      id="takeoffs"
      data={data}
      onPress={(event: NativeSyntheticEvent<PressEventWithFeatures>) => {
        event.stopPropagation();
        const raw = event.nativeEvent.features[0]?.properties?.id;
        if (raw == null) return;
        onSelect(String(raw));
      }}
    >
      <Layer
        id="takeoff-dots"
        type="circle"
        paint={{
          'circle-color': brand,
          'circle-stroke-color': paper,
          'circle-stroke-width': 2,
          'circle-opacity': 0.95,
          'circle-radius': [
            'case',
            ['==', ['get', 'id'], selectedId ?? ''],
            8,
            5,
          ],
        }}
      />
    </GeoJSONSource>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: exit 0. If `PressEventWithFeatures` is type-only and the import is erased, that is fine. If `Layer` paint rejects the expression, widen via `as const` on the expression array or satisfy `CircleLayerSpecification['paint']`.

- [ ] **Step 3: Commit**

```bash
git add components/sites/TakeoffLayer.tsx
git commit -m "$(cat <<'EOF'
feat(sites): MapLibre circle layer for takeoff points

Stop press propagation so an empty-map tap can still dismiss the sheet.
EOF
)"
```

---

### Task 6: Wire the planning map

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Replace `app/(tabs)/index.tsx` with the wired screen**

Keep existing location, recenter, Fly CTA, and missing-key notice. Add `mapRef`, takeoff hook, selection, layer, sheet, and ParaglidingEarth credit above MapTiler attribution.

Do not import anything into `app/fly.tsx`.

```tsx
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  LogManager,
  Map,
  NativeUserLocation,
  useCurrentPosition,
  type CameraRef,
  type MapRef,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '../../components/glass/GlassButton';
import { SiteSheet } from '../../components/sites/SiteSheet';
import { TakeoffLayer } from '../../components/sites/TakeoffLayer';
import { useTakeoffSites } from '../../hooks/useTakeoffSites';
import { hasMapTilerKey, mapStyleUrl } from '../../lib/maptiler';
import { useThemeColors } from '../../lib/theme';
import { font } from '../../lib/type';

const INITIAL_CENTER: [number, number] = [6.4145, 60.6285];
const INITIAL_ZOOM = 10;
const FOLLOW_ZOOM = 13;

const ICON_COLOR = { light: '#27272A', dark: '#FCFCFC' } as const;

// MapTiler v4 styles use properties MapLibre Native 6.26 lacks; the parse
// warnings otherwise pin LogBox open. Errors still come through.
LogManager.setLogLevel('error');

export default function FlyScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const [granted, setGranted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const position = useCurrentPosition({ enabled: granted });
  const { takeoffs, onViewState } = useTakeoffSites();

  const selected =
    takeoffs.find((site) => site.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !takeoffs.some((site) => site.id === selectedId)) {
      setSelectedId(null);
    }
  }, [takeoffs, selectedId]);

  useEffect(() => {
    // iOS offers this dialog once; don't spend it on a screen with no map.
    if (!hasMapTilerKey) return;

    let active = true;
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (active) setGranted(status === Location.PermissionStatus.GRANTED);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!hasMapTilerKey) {
    return <MissingKeyNotice />;
  }

  const recenter = () => {
    if (!position) return;
    cameraRef.current?.flyTo({
      center: [position.coords.longitude, position.coords.latitude],
      zoom: FOLLOW_ZOOM,
    });
  };

  const syncView = () => {
    mapRef.current?.getViewState().then((view) => {
      if (view) onViewState(view);
    });
  };

  return (
    <View className="flex-1 bg-background">
      <Map
        ref={mapRef}
        style={{ flex: 1 }}
        mapStyle={mapStyleUrl(scheme)}
        logo={false}
        attributionPosition={{ bottom: insets.bottom + 8, left: 8 }}
        onDidFinishLoadingMap={syncView}
        onRegionDidChange={(event) => onViewState(event.nativeEvent)}
        onPress={() => setSelectedId(null)}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: INITIAL_CENTER, zoom: INITIAL_ZOOM }}
        />
        {granted ? <NativeUserLocation mode="heading" /> : null}
        <TakeoffLayer
          takeoffs={takeoffs}
          selectedId={selectedId}
          brand={colors.brand}
          paper={colors.paper}
          onSelect={setSelectedId}
        />
      </Map>

      <Text
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 8,
          bottom: insets.bottom + 28,
          fontFamily: font.sans,
          fontSize: 11,
        }}
        className="text-ink-faint"
      >
        ParaglidingEarth
      </Text>

      {granted ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Centre on my position"
          onPress={recenter}
          style={{ top: insets.top + 12 }}
          className="absolute right-4 h-11 w-11 items-center justify-center rounded-full bg-surface active:opacity-70"
        >
          <Ionicons name="locate" size={20} color={ICON_COLOR[scheme]} />
        </Pressable>
      ) : null}

      <GlassButton
        accessibilityLabel="Start flying"
        onPress={() => router.push('/fly')}
        tintColor={`${colors.brand}A6`}
        borderRadius={28}
        style={{ position: 'absolute', bottom: insets.bottom + 28, right: 16 }}
        className="h-14 w-24 items-center justify-center rounded-[28px]"
      >
        <Text
          style={{ fontFamily: font.sansSemibold, fontSize: 17 }}
          className="text-paper"
        >
          Fly
        </Text>
      </GlassButton>

      <SiteSheet
        site={selected}
        bottomInset={insets.bottom}
        onClose={() => setSelectedId(null)}
      />
    </View>
  );
}

function MissingKeyNotice() {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background px-8">
      <Text className="text-2xl font-semibold text-foreground">Fly</Text>
      <Text className="text-center text-base text-muted">
        Add EXPO_PUBLIC_MAPTILER_KEY to .env and restart the bundler to load the
        terrain.
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: exit 0.

If `onViewState` rejects `ViewState` because `bounds` is `LngLatBounds` (a tuple) — that matches the hook’s `View` type. If `getViewState` is thenable and ESLint complains, ignore; no unused-result lint in this repo.

If Map `ref` typing rejects `useRef<MapRef>(null)`, use `useRef<MapRef | null>(null)` only if `tsc` requires it.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "$(cat <<'EOF'
feat(fly): show ParaglidingEarth takeoffs on the planning map

Load sites for the visible bounds and identify a tap in a sheet; leave the in-flight HUD alone.
EOF
)"
```

---

### Task 7: Verify

**Files:** none new

- [ ] **Step 1: Automated checks**

Run:

```bash
npm test
npm run typecheck
```

Expected: tests PASS, `tsc --noEmit` exit 0.

- [ ] **Step 2: Manual checklist (simulator or device)**

1. Fly tab around Voss (default camera) — after ~400ms, navy dots appear. No spinner.
2. Tap Bjørnestigen (or nearest labelled takeoff) — sheet with name, altitude, wind ticks. W should be good on the sample site used in tests; real nearby sites vary.
3. Fly button is covered while the sheet is open. Tap empty map — sheet closes, Fly is tappable again.
4. Pinch out past zoom 8 — dots disappear.
5. Zoom back in — dots return.
6. After a successful load, disable network and pan slightly **inside** the last view — dots stay.
7. Open `/fly` (in-flight) — **no** takeoff dots.
8. Attribution: “ParaglidingEarth” visible near bottom-left, above MapTiler’s i.

- [ ] **Step 3: Fix only if a check fails**

Stay inside the spec. Do not add weather, landing dots, clustering, or in-flight overlay.

If a fix is needed, commit it separately with a message that says **why**.

---

## Self-review

**Spec coverage**

| Spec item | Task |
|---|---|
| Planning map only, never `/fly` | 6 (explicit), 7.2 step 7 |
| Quiet brand dots, paper stroke, selected larger | 5 |
| Takeoffs only | 1 `isParagliding` |
| Bottom sheet: name, alt, wind, landing if coords | 3, 4 |
| Fly behind sheet | 4, 6 |
| Follow viewport bbox, HTTPS `style=detailled`, no limit | 1 `fetchTakeoffs` |
| Debounce ~400ms, min zoom 8, abort, last-good | 1 `shouldLoadTakeoffs`, 2 |
| Skip refetch if still inside last box | 1, 2 |
| Empty-map tap dismisses | 5 `stopPropagation`, 6 `onPress` |
| No spinner / no toast | 2 catch is empty, 6 has no loading UI |
| Zoom &lt; 8 clears | 2 `action === 'clear'` |
| CC BY-SA credit | 6 overlay text |
| Weather / landing dots / clustering / disk cache | omitted |

**Placeholders:** none.

**Types:** `Takeoff`, `BBox`, `Wind`, `WindLevel`, `MIN_TAKEOFF_ZOOM`, `TAKEOFF_DEBOUNCE_MS`, `shouldLoadTakeoffs`, `onViewState({ zoom, bounds })` are used the same way in later tasks as defined in Task 1–2.
