import BottomSheet, {
  BottomSheetView,
  type BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useState } from 'react';
import Animated, { type SharedValue } from 'react-native-reanimated';

import { useThemeColors } from '../../lib/theme';
import { GlassSurface } from '../glass/GlassSurface';
import { ReadoutPanel, type Readout } from './ReadoutPanel';

export { type Readout };

const HANDLE_HEIGHT = 24;
// Fallback until the climb/altitude row reports its height.
export const READOUT_PEEK = 124;

export function ReadoutSheet({
  data,
  ruleColor,
  climbColor,
  bottomInset = 0,
  animatedPosition,
}: {
  data: Readout;
  ruleColor: string;
  climbColor: string;
  bottomInset?: number;
  animatedPosition: SharedValue<number>;
}) {
  const colors = useThemeColors();
  const [peekBody, setPeekBody] = useState(0);
  const snapPoints = useMemo(
    () => [HANDLE_HEIGHT + (peekBody || READOUT_PEEK - HANDLE_HEIGHT)],
    [peekBody],
  );
  const onPeekLayout = useCallback((height: number) => {
    setPeekBody((prev) => (prev === height ? prev : height));
  }, []);

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing
      enablePanDownToClose={false}
      enableOverDrag={false}
      animateOnMount={false}
      animatedPosition={animatedPosition}
      backgroundComponent={SheetBackground}
      backgroundStyle={{ backgroundColor: 'transparent', borderRadius: 28 }}
      handleIndicatorStyle={{
        width: 36,
        height: 4,
        backgroundColor: colors.inkFaint,
        opacity: 0.4,
      }}
    >
      <BottomSheetView>
        <ReadoutPanel
          data={data}
          ruleColor={ruleColor}
          climbColor={climbColor}
          bottomInset={bottomInset}
          onPeekLayout={onPeekLayout}
        />
      </BottomSheetView>
    </BottomSheet>
  );
}

function SheetBackground({ style }: BottomSheetBackgroundProps) {
  return (
    <Animated.View style={[style, { overflow: 'hidden' }]} pointerEvents="none">
      <GlassSurface
        className="absolute inset-0 overflow-hidden"
        glassStyle="regular"
        borderRadius={28}
      />
    </Animated.View>
  );
}

