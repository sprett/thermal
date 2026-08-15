import BottomSheet, {
  BottomSheetView,
  type BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Takeoff } from '../../lib/pgearth';
import { useThemeColors } from '../../lib/theme';
import { LABEL, font } from '../../lib/type';
import { GlassSurface } from '../glass/GlassSurface';
import { WindRose } from './WindRose';

export function SiteSheet({
  site,
  bottomInset = 0,
  onClose,
}: {
  site: Takeoff | null;
  bottomInset?: number;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  if (!site) return null;

  return (
    <BottomSheet
      index={0}
      enableDynamicSizing
      enablePanDownToClose
      enableOverDrag={false}
      onClose={onClose}
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
        <View className="px-5 pt-1" style={{ paddingBottom: bottomInset + 16 }}>
          <View className="flex-row items-start justify-between">
            <View className="mr-4 flex-1">
              <Text style={LABEL} className="mb-1 text-ink-faint">
                Takeoff
              </Text>
              <Text
                style={{ fontFamily: font.sansSemibold, fontSize: 22 }}
                className="text-ink"
              >
                {site.name}
              </Text>
            </View>
            <View className="items-end">
              <Text style={LABEL} className="mb-1 text-ink-faint">
                Alt m
              </Text>
              <Text
                style={{ fontFamily: font.monoSemibold, fontSize: 22 }}
                className="text-ink"
              >
                {site.altitude}
              </Text>
            </View>
          </View>

          <View className="items-center py-3">
            <WindRose
              wind={site.wind}
              brand={colors.brand}
              muted={colors.inkMuted}
              faint={colors.inkFaint}
            />
          </View>

          {site.landing ? (
            <Text
              style={{ fontFamily: font.sans, fontSize: 14 }}
              className="text-ink-muted"
            >
              Landing recorded
            </Text>
          ) : null}
        </View>
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
