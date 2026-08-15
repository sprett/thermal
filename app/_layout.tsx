// Uniwind reads the stylesheet from here rather than from the bundle entry —
// importing it at the entry point forces a full reload instead of hot reload.
import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HeroUINativeProvider } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider>
          {/* Theme is not a provider prop: HeroUI reads Uniwind's CSS variables,
              and Uniwind defaults to following the system appearance. Light and
              dark are therefore driven by one source, with no second switch to
              keep in sync. */}
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
