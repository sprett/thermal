import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  LogManager,
  Map,
  NativeUserLocation,
  useCurrentPosition,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '../../components/glass/GlassButton';
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
  const [granted, setGranted] = useState(false);
  const position = useCurrentPosition({ enabled: granted });

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

  return (
    <View className="flex-1 bg-background">
      <Map
        style={{ flex: 1 }}
        mapStyle={mapStyleUrl(scheme)}
        logo={false}
        attributionPosition={{ bottom: insets.bottom + 8, left: 8 }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: INITIAL_CENTER, zoom: INITIAL_ZOOM }}
        />
        {granted ? <NativeUserLocation mode="heading" /> : null}
      </Map>

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
