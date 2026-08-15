import { NativeTabs } from 'expo-router/unstable-native-tabs';

// `index` is Fly: expo-router needs one route in the group to own `/`.
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
