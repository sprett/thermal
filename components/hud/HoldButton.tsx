import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { LABEL } from '../../lib/type';

const HOLD_MS = 900;

export function HoldButton({
  onHoldComplete,
  tint,
}: {
  onHoldComplete: () => void;
  tint: string;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    return () => cancelAnimation(progress);
  }, [progress]);

  const fill = useAnimatedStyle(() => ({
    height: `${progress.value * 100}%`,
  }));

  const start = () => {
    progress.value = withTiming(1, { duration: HOLD_MS }, (finished) => {
      if (finished) runOnJS(onHoldComplete)();
    });
  };

  const cancel = () => {
    cancelAnimation(progress);
    progress.value = withTiming(0, { duration: 180 });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Hold to stop recording"
      accessibilityHint="Press and hold for one second to end the flight"
      onPressIn={start}
      onPressOut={cancel}
      className="h-16 w-16 overflow-hidden rounded-xl"
      style={{ backgroundColor: `${tint}DB` }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: tint },
          fill,
        ]}
      />
      <View className="flex-1 items-center justify-center gap-1">
        <View className="h-3.5 w-3.5 bg-paper" />
        <Text style={[LABEL, { fontSize: 9, letterSpacing: 1.2 }]} className="text-paper">
          Hold
        </Text>
      </View>
    </Pressable>
  );
}
