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

      abortRef.current?.abort();

      switch (action) {
        case 'keep':
          return;
        case 'clear':
          loadedBBox.current = null;
          setTakeoffs([]);
          return;
        case 'fetch': {
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
          return;
        }
        default: {
          const _exhaustive: never = action;
          return _exhaustive;
        }
      }
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
