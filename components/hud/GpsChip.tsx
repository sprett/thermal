import { Text, View } from 'react-native';

import { LABEL, font } from '../../lib/type';
import { GlassSurface } from '../glass/GlassSurface';

/**
 * Satellite count and battery. Both are answers to "can I trust this for the
 * next three hours", which is why they sit together and stay visible rather
 * than hiding in a settings screen.
 */
export function GpsChip({
  satellites,
  battery,
  ruleColor,
}: {
  satellites: number;
  battery: number;
  ruleColor: string;
}) {
  return (
    <GlassSurface
      className="flex-row items-center gap-2 rounded-xl px-3 py-2"
    >
      <Text style={LABEL} className="text-ink-muted">
        GPS
      </Text>
      <Text
        style={{ fontFamily: font.monoMedium, fontSize: 12 }}
        className="text-ink"
      >
        {satellites}
      </Text>
      <View style={{ width: 1, height: 12, backgroundColor: ruleColor }} />
      <Text
        style={{ fontFamily: font.monoMedium, fontSize: 12 }}
        className="text-ink"
      >
        {battery}%
      </Text>
    </GlassSurface>
  );
}
