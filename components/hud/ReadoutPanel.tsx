import { Text, View } from 'react-native';

import { useThemeColors } from '../../lib/theme';
import { LABEL, font } from '../../lib/type';
import { GlassSurface } from '../glass/GlassSurface';

export type Readout = {
  climb: number;
  altitude: number;
  speed: number;
  glide: number;
  avg30: number;
  track: number;
  elapsed: string;
  distance: number;
};

/**
 * The instrument itself, in three tiers of decreasing urgency: climb and
 * altitude at a glance, the four supporting numbers below, and the two
 * session totals last. Every figure is Martian Mono and tabular, so a digit
 * changing never nudges its neighbours.
 */
export function ReadoutPanel({
  data,
  ruleColor,
  climbColor,
}: {
  data: Readout;
  ruleColor: string;
  climbColor: string;
}) {
  const colors = useThemeColors();

  return (
    <GlassSurface
      className="overflow-hidden rounded-xl"
      glassStyle="regular"
    >
      <View className="flex-row items-end gap-4 px-4 pb-3 pt-4">
        <View>
          <Text style={LABEL} className="mb-1 text-ink-faint">
            Climb m/s
          </Text>
          <Text
            style={{
              fontFamily: font.monoSemibold,
              fontSize: 64,
              letterSpacing: -2.5,
              lineHeight: 68,
            }}
            className="text-ink"
          >
            {signed(data.climb, 1)}
          </Text>
        </View>
        <View className="ml-auto items-end">
          <Text style={LABEL} className="mb-1 text-ink-faint">
            Altitude m
          </Text>
          <Text
            style={{
              fontFamily: font.monoSemibold,
              fontSize: 38,
              letterSpacing: -1.2,
              lineHeight: 42,
            }}
            className="text-ink"
          >
            {Math.round(data.altitude)}
          </Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: ruleColor }} />

      <View className="flex-row flex-wrap px-4 pb-3.5 pt-3">
        <Cell label="Speed km/h" value={String(Math.round(data.speed))} color={colors.ink} />
        <Cell label="Glide" value={data.glide.toFixed(1)} color={colors.ink} />
        <Cell
          label="Avg 30s m/s"
          value={signed(data.avg30, 1)}
          color={climbColor}
        />
        <Cell label="Track" value={`${pad3(data.track)}°`} color={colors.ink} />
      </View>

      <View style={{ height: 1, backgroundColor: ruleColor }} />

      <View className="flex-row gap-6 px-4 pb-3 pt-2.5">
        <Total label="Elapsed" value={data.elapsed} />
        <Total label="Dist km" value={data.distance.toFixed(1)} />
      </View>
    </GlassSurface>
  );
}

/**
 * `color` is required, not optional. Passing `{ color: undefined }` in a style
 * object still counts as a style, and the style prop outranks className — so an
 * absent colour silently cancelled `text-ink` and the number fell back to
 * black, invisible on the dark panel. Resolve it once, explicitly.
 */
function Cell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View className="w-1/2 pb-3">
      <Text style={LABEL} className="text-ink-faint">
        {label}
      </Text>
      <Text
        style={{
          fontFamily: font.monoMedium,
          fontSize: 28,
          letterSpacing: -0.5,
          color,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline gap-2">
      <Text style={LABEL} className="text-ink-faint">
        {label}
      </Text>
      <Text
        style={{ fontFamily: font.monoMedium, fontSize: 14 }}
        className="text-ink-muted"
      >
        {value}
      </Text>
    </View>
  );
}

/** A vario reading without its sign is ambiguous, so the plus is never dropped. */
function signed(value: number, digits: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function pad3(deg: number): string {
  return String(Math.round(deg)).padStart(3, '0');
}
