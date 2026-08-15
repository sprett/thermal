import { NativeTabs } from 'expo-router/unstable-native-tabs';

/**
 * A real UITabBar on iOS and a Material bottom nav on Android — the system
 * draws it, so the blur, the scroll-edge behaviour and the theme response are
 * the platform's, not a reimplementation of them.
 *
 * `index` is the Fly screen; expo-router needs one route in the group to own
 * `/`, and Fly is where the app should open.
 */
export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'paperplane', selected: 'paperplane.fill' }}
          md={{ default: 'paragliding', selected: 'paragliding' }}
        />
        <NativeTabs.Trigger.Label>Fly</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="flights">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'list.bullet', selected: 'list.bullet' }}
          md={{ default: 'list', selected: 'list' }}
        />
        <NativeTabs.Trigger.Label>Flights</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'map', selected: 'map.fill' }}
          md={{ default: 'map', selected: 'map' }}
        />
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="you">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person', selected: 'person.fill' }}
          md={{ default: 'person', selected: 'person' }}
        />
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
