import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  cloudbaseMeters,
  compass16,
  fetchForecast,
  filterTakeoffs,
  flyable,
  hourLabel,
  oktasFromCover,
  parseForecast,
  pinMark,
  windKeyFromDeg,
  windyUrl,
} from './weather';
import type { Takeoff, Wind } from './pgearth';

const westGood: Wind = {
  N: 0,
  NE: 0,
  E: 0,
  SE: 0,
  S: 0,
  SW: 0,
  W: 2,
  NW: 0,
};

const raw = {
  current: {
    time: '2026-08-16T18:45',
    wind_speed_10m: 3.94,
    wind_direction_10m: 157,
    wind_gusts_10m: 6.22,
    temperature_2m: 18,
    dew_point_2m: 10,
    cloud_cover: 38,
    cape: 420,
  },
  hourly: {
    time: [
      '2026-08-16T18:00',
      '2026-08-16T19:00',
      '2026-08-16T20:00',
    ],
    wind_speed_10m: [3.94, 4.7, 6.67],
    wind_direction_10m: [157, 160, 200],
    wind_gusts_10m: [6.22, 5.8, 8.9],
  },
};

test('windKeyFromDeg snaps meteorological from-degrees onto eight ticks', () => {
  assert.equal(windKeyFromDeg(0), 'N');
  assert.equal(windKeyFromDeg(157), 'SE');
  assert.equal(windKeyFromDeg(226), 'SW');
  assert.equal(windKeyFromDeg(350), 'N');
});

test('compass16 names the finer from-direction', () => {
  assert.equal(compass16(157), 'SSE');
  assert.equal(compass16(226), 'SW');
});

test('parseForecast reads current wind, clouds, and the next hours', () => {
  const forecast = parseForecast(raw);
  assert.ok(forecast);
  assert.equal(forecast.current.speedMs, 3.9);
  assert.equal(forecast.current.gustMs, 6.2);
  assert.equal(forecast.current.fromDeg, 157);
  assert.equal(forecast.current.fromKey, 'SE');
  assert.equal(forecast.current.fromLabel, 'SSE');
  assert.equal(forecast.oktas, 3);
  assert.equal(forecast.cape, 420);
  assert.equal(forecast.hours.length, 3);
  assert.equal(forecast.hours[0]?.hourLabel, 'NOW');
  assert.equal(forecast.hours[1]?.hourLabel, '19');
  assert.equal(forecast.hours[2]?.speedMs, 6.7);
});

test('parseForecast returns null when current wind is missing', () => {
  assert.equal(parseForecast({}), null);
  assert.equal(parseForecast({ current: { time: '2026-08-16T18:00' } }), null);
});

test('flyable is good in the window, off when the wind is wrong or too strong', () => {
  assert.equal(
    flyable(westGood, {
      speedMs: 3.9,
      gustMs: 6.2,
      fromDeg: 270,
      fromKey: 'W',
      fromLabel: 'W',
    }),
    'good',
  );
  assert.equal(
    flyable(westGood, {
      speedMs: 3.9,
      gustMs: 6.2,
      fromDeg: 90,
      fromKey: 'E',
      fromLabel: 'E',
    }),
    'off',
  );
  assert.equal(
    flyable(westGood, {
      speedMs: 10,
      gustMs: 13,
      fromDeg: 270,
      fromKey: 'W',
      fromLabel: 'W',
    }),
    'strong',
  );
});

const none: Wind = {
  N: 0,
  NE: 0,
  E: 0,
  SE: 0,
  S: 0,
  SW: 0,
  W: 0,
  NW: 0,
};

const possibleOnly: Wind = {
  N: 0,
  NE: 0,
  E: 0,
  SE: 1,
  S: 0,
  SW: 0,
  W: 0,
  NW: 0,
};

const westSample = {
  speedMs: 3.9,
  gustMs: 6.2,
  fromDeg: 270,
  fromKey: 'W' as const,
  fromLabel: 'W',
};

test('pinMark is grey with no orientations, green when flyable, orange otherwise', () => {
  assert.equal(pinMark(none, westSample), 'none');
  assert.equal(pinMark(westGood, westSample), 'good');
  assert.equal(pinMark(westGood, { ...westSample, fromKey: 'E', fromDeg: 90 }), 'marginal');
  assert.equal(pinMark(possibleOnly, null), 'marginal');
  assert.equal(pinMark(westGood, null), 'good');
});

function site(partial: Partial<Takeoff> & Pick<Takeoff, 'id' | 'name'>): Takeoff {
  return {
    altitude: 1000,
    latitude: 60.64,
    longitude: 6.54,
    countryCode: 'NO',
    description: null,
    flightRules: null,
    goingThere: null,
    comments: null,
    weatherNotes: null,
    pgeLink: null,
    parking: null,
    landing: null,
    styles: {
      thermals: false,
      soaring: false,
      xc: false,
      flatland: false,
      winch: false,
    },
    wind: westGood,
    ...partial,
  };
}

test('filterTakeoffs searches name and applies flyable, distance, and XC chips', () => {
  const near = site({
    id: '1',
    name: 'Bjørnestigen',
    latitude: 60.64,
    longitude: 6.54,
    styles: {
      thermals: true,
      soaring: true,
      xc: true,
      flatland: false,
      winch: false,
    },
  });
  const far = site({
    id: '2',
    name: 'Salknappen',
    latitude: 61.88,
    longitude: 9.1,
    wind: none,
  });
  const soaringOnly = site({
    id: '3',
    name: 'Hang',
    wind: possibleOnly,
  });

  const all = [near, far, soaringOnly];
  const from = { lat: 60.64, lng: 6.54 };

  assert.deepEqual(
    filterTakeoffs(all, { query: 'bjørn', flyableNow: false, withinKm: null, xc: false, from, sample: westSample }).map((s) => s.id),
    ['1'],
  );
  assert.deepEqual(
    filterTakeoffs(all, { query: '', flyableNow: true, withinKm: null, xc: false, from, sample: westSample }).map((s) => s.id),
    ['1'],
  );
  assert.deepEqual(
    filterTakeoffs(all, { query: '', flyableNow: false, withinKm: 50, xc: false, from, sample: westSample }).map((s) => s.id),
    ['1', '3'],
  );
  assert.deepEqual(
    filterTakeoffs(all, { query: '', flyableNow: false, withinKm: null, xc: true, from, sample: westSample }).map((s) => s.id),
    ['1'],
  );
});

test('cloudbaseMeters uses the spread rule from takeoff height', () => {
  assert.equal(cloudbaseMeters(18, 10, 1480), 2480);
});

test('oktasFromCover maps percent onto eighths', () => {
  assert.equal(oktasFromCover(0), 0);
  assert.equal(oktasFromCover(38), 3);
  assert.equal(oktasFromCover(100), 8);
});

test('hourLabel marks the current hour as NOW', () => {
  assert.equal(hourLabel('2026-08-16T18:00', '2026-08-16T18:45'), 'NOW');
  assert.equal(hourLabel('2026-08-16T19:00', '2026-08-16T18:45'), '19');
});

test('windyUrl deep-links the takeoff on Windy', () => {
  assert.equal(
    windyUrl(61.876, 9.095),
    'https://www.windy.com/61.876/9.095',
  );
});

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('fetchForecast hits Open-Meteo and parses the body', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input));
    return new Response(JSON.stringify(raw), { status: 200 });
  }) as typeof fetch;

  const forecast = await fetchForecast(60.6432, 6.54287);
  assert.equal(forecast.current.fromLabel, 'SSE');
  const url = new URL(calls[0]!);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname, 'api.open-meteo.com');
  assert.equal(url.pathname, '/v1/forecast');
  assert.equal(url.searchParams.get('latitude'), '60.6432');
  assert.equal(url.searchParams.get('wind_speed_unit'), 'ms');
});
