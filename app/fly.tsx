import {
  Camera,
  Map,
  NativeUserLocation,
  useCurrentPosition,
} from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AirspaceBanner } from '../components/hud/AirspaceBanner';
import { GpsChip } from '../components/hud/GpsChip';
import { HoldButton } from '../components/hud/HoldButton';
import { ModeToggle, type HudMode } from '../components/hud/ModeToggle';
import { ReadoutPanel, type Readout } from '../components/hud/ReadoutPanel';
import { VarioTape, type VarioSample } from '../components/hud/VarioTape';
import { mapStyleUrl } from '../lib/maptiler';
import { useScheme, useThemeColors } from '../lib/theme';

export default function FlyScreen() {
  const colors = useThemeColors();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<HudMode>('map');
  const { readout, samples } = useSimulatedFlight();
  const position = useCurrentPosition({ enabled: true });

  return (
    <View className="flex-1 bg-paper">
      <View className="absolute inset-0">
        <Map
          style={{ flex: 1 }}
          mapStyle={mapStyleUrl(scheme)}
          logo={false}
          attribution={false}
          compass={false}
        >
          <Camera
            trackUserLocation="heading"
            initialViewState={{
              center: position
                ? [position.coords.longitude, position.coords.latitude]
                : [6.4145, 60.6285],
              zoom: 13,
            }}
          />
          <NativeUserLocation mode="heading" />
        </Map>
      </View>

      <View
        style={{ top: insets.top + 8 }}
        className="absolute left-3 right-3"
      >
        <AirspaceBanner
          name="Oslo TMA"
          clearance="220 m below"
          flightLevel="FL 095"
        />
      </View>

      <View
        style={{ top: insets.top + 70 }}
        className="absolute left-0"
      >
        <VarioTape samples={samples} climb={readout.climb} colors={colors} />
      </View>

      <View
        style={{ top: insets.top + 154 }}
        className="absolute right-3 items-end gap-2"
      >
        <ModeToggle mode={mode} onChange={setMode} brand={colors.brand} />
        <GpsChip satellites={11} battery={64} ruleColor={colors.rule} />
      </View>

      <View
        style={{ bottom: insets.bottom + 336 }}
        className="absolute right-5"
      >
        <HoldButton tint={colors.sink} onHoldComplete={() => router.back()} />
      </View>

      <View
        style={{ bottom: insets.bottom + 8 }}
        className="absolute left-2 right-2"
      >
        <ReadoutPanel
          data={readout}
          ruleColor={colors.rule}
          climbColor={readout.avg30 >= 0 ? colors.climb : colors.sink}
        />
      </View>
    </View>
  );
}

function useSimulatedFlight() {
  const [samples, setSamples] = useState<VarioSample[]>([]);
  const [readout, setReadout] = useState<Readout>({
    climb: 2.4,
    altitude: 1630,
    speed: 38,
    glide: 8.2,
    avg30: 1.8,
    track: 42,
    elapsed: '2:14:08',
    distance: 41.2,
  });

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      const t = (Date.now() - started) / 1000;
      const climb = 2.2 * Math.sin(t / 7) + 0.8 * Math.sin(t / 2.3);

      setSamples((prev) => [...prev, { t, climb }].slice(-90));
      setReadout((prev) => ({
        ...prev,
        climb,
        altitude: prev.altitude + climb,
        avg30: 1.8 + 0.6 * Math.sin(t / 11),
        speed: 38 + 4 * Math.sin(t / 5),
        track: (42 + t * 0.7) % 360,
      }));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return { readout, samples };
}
