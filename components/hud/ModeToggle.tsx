import { Text, View } from 'react-native';

import { LABEL } from '../../lib/type';
import { GlassButton } from '../glass/GlassButton';
import { GlassSurface } from '../glass/GlassSurface';

export type HudMode = 'map' | 'inst';

/**
 * Map or instrument. Two states, so a segmented control rather than a menu —
 * the switch has to be hittable without looking at it.
 */
export function ModeToggle({
  mode,
  onChange,
  brand,
}: {
  mode: HudMode;
  onChange: (mode: HudMode) => void;
  brand: string;
}) {
  return (
    <GlassSurface
      className="flex-row overflow-hidden rounded-xl"
    >
      <Segment
        label="Map"
        active={mode === 'map'}
        brand={brand}
        onPress={() => onChange('map')}
      />
      <Segment
        label="Inst"
        active={mode === 'inst'}
        brand={brand}
        onPress={() => onChange('inst')}
      />
    </GlassSurface>
  );
}

function Segment({
  label,
  active,
  brand,
  onPress,
}: {
  label: string;
  active: boolean;
  brand: string;
  onPress: () => void;
}) {
  // The selected segment is solid, not glass. It has to survive being read
  // against snow, forest and water in turn, and a translucent chip does not.
  if (active) {
    return (
      <View
        accessibilityRole="button"
        accessibilityState={{ selected: true }}
        style={{ backgroundColor: brand }}
        className="px-3 py-2.5"
      >
        <Text style={LABEL} className="text-paper">
          {label}
        </Text>
      </View>
    );
  }

  return (
    <GlassButton
      accessibilityLabel={`Show ${label}`}
      accessibilitySelected={false}
      onPress={onPress}
      glassStyle="clear"
      className="px-3 py-2.5"
    >
      <Text style={LABEL} className="text-ink-muted">
        {label}
      </Text>
    </GlassButton>
  );
}
