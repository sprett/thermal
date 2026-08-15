import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { GlassSurface } from '../glass/GlassSurface';

const TAPE_W = 56;
const TAPE_H = 400;
const GAUGE_W = 28;

export type VarioSample = { t: number; climb: number };

export function VarioTape({
  samples,
  climb,
  colors,
}: {
  samples: VarioSample[];
  climb: number;
  colors: {
    climb: string;
    climbStrong: string;
    sink: string;
    rule: string;
    ruleStrong: string;
  };
}) {
  const bands = useMemo(() => buildBands(samples), [samples]);

  const needle = climbToY(climb);

  return (
    <GlassSurface
      className="h-[400px] w-[100px] flex-row overflow-hidden rounded-r-xl"
      glassStyle="clear"
    >
      <Svg width={TAPE_W} height={TAPE_H} viewBox={`0 0 ${TAPE_W} ${TAPE_H}`}>
        {bands.strong ? <Path d={bands.strong} fill={colors.climbStrong} /> : null}
        {bands.lift ? <Path d={bands.lift} fill={colors.climb} /> : null}
        {bands.sink ? <Path d={bands.sink} fill={colors.sink} /> : null}
      </Svg>

      <View style={{ width: 1, backgroundColor: colors.rule }} />

      <Svg width={GAUGE_W} height={TAPE_H}>
        {[0.1, 0.3, 0.7, 0.9].map((f) => (
          <Line
            key={f}
            x1={GAUGE_W / 2}
            y1={TAPE_H * f}
            x2={GAUGE_W}
            y2={TAPE_H * f}
            stroke={colors.rule}
            strokeWidth={1}
          />
        ))}
        <Rect
          x={0}
          y={Math.min(needle, TAPE_H / 2)}
          width={GAUGE_W}
          height={Math.abs(needle - TAPE_H / 2)}
          fill={climb >= 0 ? colors.climb : colors.sink}
        />
        <Line
          x1={0}
          y1={TAPE_H / 2}
          x2={GAUGE_W}
          y2={TAPE_H / 2}
          stroke={colors.ruleStrong}
          strokeWidth={1}
        />
      </Svg>
    </GlassSurface>
  );
}

function climbToY(climb: number): number {
  const clamped = Math.max(-5, Math.min(5, climb));
  return TAPE_H / 2 - (clamped / 5) * (TAPE_H / 2);
}

function buildBands(samples: VarioSample[]) {
  if (samples.length === 0) return { strong: '', lift: '', sink: '' };

  const step = TAPE_H / Math.max(samples.length - 1, 1);
  const parts = { strong: '', lift: '', sink: '' };

  samples.forEach((s, i) => {
    const y = TAPE_H - i * step;
    const w = Math.min(TAPE_W, (Math.abs(s.climb) / 5) * TAPE_W);
    if (w <= 0) return;
    const key = s.climb >= 2 ? 'strong' : s.climb > 0 ? 'lift' : 'sink';
    parts[key] += `M0 ${y.toFixed(1)}L${w.toFixed(1)} ${y.toFixed(1)}L${w.toFixed(1)} ${(y - step).toFixed(1)}L0 ${(y - step).toFixed(1)}Z`;
  });

  return parts;
}
