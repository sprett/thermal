import { Text, View } from 'react-native';

import { LABEL, font } from '../../lib/type';
import { GlassSurface } from '../glass/GlassSurface';

export function AirspaceBanner({
  name,
  clearance,
  flightLevel,
}: {
  name: string;
  clearance: string;
  flightLevel: string;
}) {
  return (
    <GlassSurface
      className="h-[46px] flex-row items-center overflow-hidden rounded-xl"
      glassStyle="regular"
    >
      <View className="h-full w-[3px] bg-warn" />
      <Text style={LABEL} className="ml-3 text-warn">
        Airspace
      </Text>
      <Text
        style={{ fontFamily: font.monoMedium, fontSize: 13, letterSpacing: -0.2 }}
        className="ml-3 text-ink"
        numberOfLines={1}
      >
        {name} · {clearance}
      </Text>
      <Text style={LABEL} className="ml-auto pr-3.5 text-ink-muted">
        {flightLevel}
      </Text>
    </GlassSurface>
  );
}
