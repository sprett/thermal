import {
  GeoJSONSource,
  Layer,
  type PressEventWithFeatures,
} from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';
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
  const data = useMemo(() => takeoffsToGeoJSON(takeoffs), [takeoffs]);

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
