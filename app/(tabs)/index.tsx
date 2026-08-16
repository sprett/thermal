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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '../../components/glass/GlassButton';
import { SiteSheet } from '../../components/sites/SiteSheet';
import { TakeoffLayer } from '../../components/sites/TakeoffLayer';
import { useTakeoffSites } from '../../hooks/useTakeoffSites';
import { useForecast } from '../../hooks/useTakeoffWeather';
import { hasMapTilerKey, mapStyleUrl } from '../../lib/maptiler';
import { useThemeColors } from '../../lib/theme';
import { font } from '../../lib/type';

const INITIAL_CENTER: [number, number] = [6.4145, 60.6285];
const INITIAL_ZOOM = 10;
const FOLLOW_ZOOM = 13;

// MapTiler v4 styles use properties MapLibre Native 6.26 lacks; the parse
// warnings otherwise pin LogBox open. Errors still come through.
LogManager.setLogLevel('error');

export default function FlyScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);
  const ignoreMapPress = useRef(false);
  const [granted, setGranted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const position = useCurrentPosition({ enabled: granted });
  const { takeoffs, onViewState } = useTakeoffSites();

  const region = useMemo(() => regionPoint(takeoffs), [takeoffs]);
  const forecast = useForecast(region?.lat, region?.lng);
  const sample = forecast?.current ?? null;

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

  const selectSite = (id: string) => {
    ignoreMapPress.current = true;
    setSelectedId(id);
  };

  const clearSelection = () => {
    setSelectedId(null);
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
        onPress={() => {
          if (ignoreMapPress.current) {
            ignoreMapPress.current = false;
            return;
          }
          clearSelection();
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: INITIAL_CENTER, zoom: INITIAL_ZOOM }}
        />
        {granted ? <NativeUserLocation mode="heading" /> : null}
        <TakeoffLayer
          takeoffs={takeoffs}
          selectedId={selectedId}
          sample={sample}
          onSelect={selectSite}
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

      {selected ? (
        <GlassButton
          accessibilityLabel="Close takeoff"
          onPress={clearSelection}
          borderRadius={20}
          style={{ position: 'absolute', top: insets.top + 12, left: 12 }}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <Ionicons name="close" size={22} color={colors.ink} />
        </GlassButton>
      ) : null}

      {granted ? (
        <GlassButton
          accessibilityLabel="Centre on my position"
          onPress={recenter}
          borderRadius={20}
          style={{ position: 'absolute', top: insets.top + 12, right: 12 }}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <Ionicons name="navigate" size={18} color={colors.brand} />
        </GlassButton>
      ) : null}

      {selected ? null : (
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
      )}

      <SiteSheet
        site={selected}
        from={position?.coords ?? null}
        bottomInset={insets.bottom}
        onClose={clearSelection}
      />
    </View>
  );
}

function regionPoint(
  sites: { latitude: number; longitude: number }[],
): { lat: number; lng: number } | null {
  if (sites.length === 0) return null;
  let lat = 0;
  let lng = 0;
  for (const site of sites) {
    lat += site.latitude;
    lng += site.longitude;
  }
  return {
    lat: Math.round((lat / sites.length) * 100) / 100,
    lng: Math.round((lng / sites.length) * 100) / 100,
  };
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
