import { Circle, G, Line, Path, Svg, Text as SvgText } from 'react-native-svg';

import {
  WIND_KEYS,
  launchWindow,
  primaryAspect,
  type Wind,
} from '../../lib/pgearth';
import { font } from '../../lib/type';

const SIZE = 96;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 41;

function polar(deg: number, radius = RADIUS) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function sectorPath(startIndex: number, length: number): string {
  const startDeg = startIndex * 45 - 90 - 22.5;
  const endDeg = (startIndex + length - 1) * 45 - 90 + 22.5;
  let delta = (endDeg - startDeg + 360) % 360;
  if (delta === 0) delta = 360;
  const large = delta > 180 ? 1 : 0;
  const start = polar(startDeg);
  const end = polar(endDeg);
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${end.x} ${end.y} Z`;
}

export function WindRose({
  wind,
  climb,
  faint,
  ink,
  fromDeg = null,
}: {
  wind: Wind;
  climb: string;
  faint: string;
  ink?: string;
  fromDeg?: number | null;
}) {
  const window = launchWindow(wind);
  const label = primaryAspect(wind);
  const full = window?.length === WIND_KEYS.length;

  return (
    <Svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      accessibilityLabel={
        label ? `Launch window around ${label}` : 'No suitable wind direction'
      }
    >
      <Circle
        cx={CX}
        cy={CY}
        r={RADIUS}
        fill="none"
        stroke={faint}
        strokeWidth={1}
      />
      {window && !full ? (
        <Path
          d={sectorPath(window.start, window.length)}
          fill={climb}
          fillOpacity={0.16}
          stroke={climb}
          strokeWidth={1.2}
        />
      ) : null}
      {full ? (
        <Circle cx={CX} cy={CY} r={RADIUS} fill={climb} fillOpacity={0.16} />
      ) : null}
      {ink && fromDeg != null ? (
        <G rotation={fromDeg} originX={CX} originY={CY}>
          <Line
            x1={CX}
            y1={14}
            x2={CX}
            y2={40}
            stroke={ink}
            strokeWidth={2.2}
          />
          <Path
            d={`M${CX} ${CY} L${CX - 7} ${CY - 14} L${CX + 7} ${CY - 14} Z`}
            fill={ink}
          />
        </G>
      ) : null}
      {ink ? <Circle cx={CX} cy={CY} r={4} fill={ink} /> : null}
      <SvgText
        x={CX}
        y={10}
        textAnchor="middle"
        fontFamily={font.sansSemibold}
        fontSize={9}
        fill={faint}
      >
        N
      </SvgText>
      <SvgText
        x={SIZE - 4}
        y={CY + 3}
        textAnchor="middle"
        fontFamily={font.sansSemibold}
        fontSize={9}
        fill={faint}
      >
        E
      </SvgText>
      <SvgText
        x={CX}
        y={SIZE - 2}
        textAnchor="middle"
        fontFamily={font.sansSemibold}
        fontSize={9}
        fill={faint}
      >
        S
      </SvgText>
      <SvgText
        x={8}
        y={CY + 3}
        textAnchor="middle"
        fontFamily={font.sansSemibold}
        fontSize={9}
        fill={faint}
      >
        W
      </SvgText>
    </Svg>
  );
}
