import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useState, type ReactNode } from 'react';
import {
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useThemeColors } from '../../lib/theme';

/**
 * A panel of chrome floating over the map.
 *
 * Liquid Glass is iOS 26+ only, and `isLiquidGlassAvailable()` is the switch.
 * Where it doesn't exist we don't fake it: the fallback is a near-opaque paper
 * surface with a hairline, which reads as deliberate rather than as a degraded
 * effect.
 *
 * Two constraints shape this component, both learned the hard way:
 *
 * 1. Uniwind does not apply `className` to GlassView — it styles the components
 *    it wraps, and a third-party native view is not one of them. Anything the
 *    glass needs must arrive through `style`.
 * 2. GlassView takes its frame at mount and does not pick up a size that
 *    arrives later, so `absoluteFill` inside a class-sized parent leaves it at
 *    zero and it draws nothing.
 *
 * So the layout lives on a plain View, which we measure, and the glass is drawn
 * behind the content at that measured size.
 *
 * Both paths carry a paper tint: glass over a pale topo map has very little to
 * refract, and a panel you cannot see is worse than no glass at all.
 */
export function GlassSurface({
  children,
  style,
  className,
  glassStyle = 'regular',
  tintColor,
  borderRadius = 12,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Sizing, shape and content layout of the panel. */
  className?: string;
  glassStyle?: 'clear' | 'regular';
  tintColor?: string;
  borderRadius?: number;
}) {
  const colors = useThemeColors();
  const tint = tintColor ?? `${colors.paper}D9`;
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  const glassReady = isLiquidGlassAvailable() && size.width > 0 && size.height > 0;

  return (
    <View style={style} className={className} onLayout={onLayout}>
      {glassReady ? (
        <GlassView
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: size.width,
            height: size.height,
            borderRadius,
          }}
          glassEffectStyle={glassStyle}
          tintColor={tint}
        />
      ) : (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            borderRadius,
            backgroundColor: tint,
            borderWidth: 1,
            borderColor: colors.rule,
          }}
        />
      )}
      {children}
    </View>
  );
}

export { isLiquidGlassAvailable };
