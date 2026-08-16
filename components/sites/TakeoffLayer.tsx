import { Marker } from '@maplibre/maplibre-react-native';
import { Text, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';

import type { Takeoff } from '../../lib/pgearth';
import { useThemeColors } from '../../lib/theme';
import { font } from '../../lib/type';
import { pinMark, type PinMark, type WindSample } from '../../lib/weather';

export function TakeoffLayer({
  takeoffs,
  selectedId,
  sample,
  onSelect,
}: {
  takeoffs: Takeoff[];
  selectedId: string | null;
  sample: WindSample | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {takeoffs.map((site) => (
        <Marker
          key={site.id}
          id={`takeoff-${site.id}`}
          lngLat={[site.longitude, site.latitude]}
          anchor="bottom"
          onPress={(event) => {
            event.stopPropagation();
            onSelect(site.id);
          }}
        >
          <TakeoffPin
            altitude={site.altitude}
            mark={pinMark(site.wind, sample)}
            dimmed={selectedId != null && selectedId !== site.id}
          />
        </Marker>
      ))}
    </>
  );
}

function TakeoffPin({
  altitude,
  mark,
  dimmed,
}: {
  altitude: number;
  mark: PinMark;
  dimmed: boolean;
}) {
  const colors = useThemeColors();
  const triangle = markColor(mark, colors);

  return (
    <View
      collapsable={false}
      className="items-center"
      style={{ opacity: dimmed ? 0.55 : 1 }}
      pointerEvents="none"
    >
      <View
        className="flex-row items-center"
        style={{
          height: 26,
          paddingHorizontal: 9,
          gap: 5,
          borderRadius: 13,
          backgroundColor: colors.paper,
          shadowColor: '#16181A',
          shadowOpacity: 0.22,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      >
        <Svg width={10} height={9} viewBox="0 0 10 9">
          <Path d="M5 0L10 9H0Z" fill={triangle} />
        </Svg>
        <Text
          style={{
            fontFamily: font.monoSemibold,
            fontSize: 11,
            fontVariant: ['tabular-nums'],
            color: mark === 'good' ? colors.ink : colors.inkMuted,
          }}
        >
          {altitude}
        </Text>
      </View>
      <View
        style={{ width: 1, height: 9, backgroundColor: colors.paper }}
      />
    </View>
  );
}

function markColor(
  mark: PinMark,
  colors: ReturnType<typeof useThemeColors>,
): string {
  switch (mark) {
    case 'good':
      return colors.climbStrong;
    case 'marginal':
      return colors.sink;
    case 'none':
      return colors.neutralAir;
    default: {
      const _exhaustive: never = mark;
      return _exhaustive;
    }
  }
}
