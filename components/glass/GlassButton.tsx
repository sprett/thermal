import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useThemeColors } from '../../lib/theme';

type Props = {
  children?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  accessibilitySelected?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
  glassStyle?: 'clear' | 'regular';
  /** Must be translucent; a solid colour hides the glass. */
  tintColor?: string;
  borderRadius?: number;
  disabled?: boolean;
};

export function GlassButton({
  children,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilitySelected,
  style,
  className,
  glassStyle = 'regular',
  tintColor,
  borderRadius = 12,
  disabled,
}: Props) {
  const colors = useThemeColors();
  const tint = tintColor ?? `${colors.paper}D9`;
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  // See GlassSurface: the glass has to be measured and sized in `style`.
  const glassReady = isLiquidGlassAvailable() && size.width > 0 && size.height > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={
        accessibilitySelected === undefined
          ? undefined
          : { selected: accessibilitySelected }
      }
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      style={style}
      className={className}
      onLayout={onLayout}
    >
      {({ pressed }) => (
        <>
          {glassReady ? (
            <GlassView
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: size.width,
                height: size.height,
                borderRadius,
                opacity: pressed ? 0.86 : 1,
              }}
              glassEffectStyle={glassStyle}
              tintColor={tint}
              isInteractive
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
                opacity: pressed ? 0.72 : 1,
              }}
            />
          )}
          {children}
        </>
      )}
    </Pressable>
  );
}
