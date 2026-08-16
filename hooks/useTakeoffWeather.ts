import { useEffect, useState } from 'react';

import type { Takeoff } from '../lib/pgearth';
import { fetchForecast, type SiteForecast } from '../lib/weather';

export function useForecast(
  lat: number | null | undefined,
  lng: number | null | undefined,
) {
  const [forecast, setForecast] = useState<SiteForecast | null>(null);

  useEffect(() => {
    if (lat == null || lng == null) {
      setForecast(null);
      return;
    }

    setForecast(null);
    const ac = new AbortController();
    fetchForecast(lat, lng, ac.signal)
      .then((next) => {
        if (!ac.signal.aborted) setForecast(next);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
      });

    return () => ac.abort();
  }, [lat, lng]);

  return forecast;
}

export function useTakeoffWeather(site: Takeoff | null) {
  return useForecast(site?.latitude, site?.longitude);
}
