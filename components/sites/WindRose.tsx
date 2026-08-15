import { Circle, Line, Svg, Text as SvgText } from 'react-native-svg';

import { WIND_KEYS, type Wind, type WindKey } from '../../lib/pgearth';
import { font } from '../../lib/type';

const SIZE = 88;
const CX = SIZE / 2;
const CY = SIZE / 2;
const INNER = 22;
const OUTER = 34;

function tickColor(
  key: WindKey,
  wind: Wind,
  brand: string,
  muted: string,
  faint: string,
): string {
  const level = wind[key];
  switch (level) {
    case 2:
      return brand;
    case 1:
      return muted;
    case 0:
      return faint;
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

function bestKey(wind: Wind): WindKey | null {
  for (const key of WIND_KEYS) {
    if (wind[key] === 2) return key;
  }
  for (const key of WIND_KEYS) {
    if (wind[key] === 1) return key;
  }
  return null;
}

export function WindRose({
  wind,
  brand,
  muted,
  faint,
}: {
  wind: Wind;
  brand: string;
  muted: string;
  faint: string;
}) {
  const label = bestKey(wind);

  return (
    <Svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      accessibilityLabel={
        label ? `Wind good from ${label}` : 'No suitable wind direction'
      }
    >
      <Circle
        cx={CX}
        cy={CY}
        r={OUTER + 2}
        fill="none"
        stroke={faint}
        strokeWidth={1}
      />
      {WIND_KEYS.map((key, i) => {
        const rad = ((i * 45 - 90) * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const good = wind[key] === 2;
        return (
          <Line
            key={key}
            x1={CX + cos * INNER}
            y1={CY + sin * INNER}
            x2={CX + cos * OUTER}
            y2={CY + sin * OUTER}
            stroke={tickColor(key, wind, brand, muted, faint)}
            strokeWidth={good ? 5 : 3}
            strokeLinecap="round"
          />
        );
      })}
      {label ? (
        <SvgText
          x={CX}
          y={CY + 4}
          textAnchor="middle"
          fontFamily={font.sansSemibold}
          fontSize={11}
          fill={muted}
        >
          {label}
        </SvgText>
      ) : null}
    </Svg>
  );
}
