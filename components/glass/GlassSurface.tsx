import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useState, type ReactNode } from 'react';
import {
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useThemeColors } from '../../lib/theme';

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

  // GlassView takes its frame at mount and ignores className, so it must be
  // measured and sized in `style` or it renders nothing at all.
  const glassReady = isLiquidGlassAvailable() && size.width > 0 && size.height > 0;

  return (
    <View style={style} className={className} onLayout={onLayout}>
      {glassReady ? (
        <GlassView
          pointerEvents="none"
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
          pointerEvents="none"
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
