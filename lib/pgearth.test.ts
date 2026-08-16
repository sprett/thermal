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

test('parseTakeoffs treats PGE missing-altitude sentinel as 0', () => {
  const sites = parseTakeoffs({
    type: 'FeatureCollection',
    features: [
      {
        ...pgeFeature,
        properties: {
          ...pgeFeature.properties,
          takeoff_altitude: '-32768',
        },
      },
    ],
  });
  assert.equal(sites.length, 1);
  assert.equal(sites[0]?.altitude, 0);
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
