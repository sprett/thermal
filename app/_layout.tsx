// Uniwind reads the stylesheet from here rather than from the bundle entry —
// importing it at the entry point forces a full reload instead of hot reload.
import '../global.css';

import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';
import {
  MartianMono_400Regular,
  MartianMono_500Medium,
  MartianMono_600SemiBold,
} from '@expo-google-fonts/martian-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { HeroUINativeProvider } from 'heroui-native';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    MartianMono_400Regular,
    MartianMono_500Medium,
    MartianMono_600SemiBold,
  });

  useEffect(() => {
    // Hide on error too, rather than holding the splash forever.
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
            <Stack.Screen
              name="fly"
              options={{
                presentation: 'card',
                animation: 'fade',
                animationDuration: 320,
                gestureEnabled: false,
              }}
            />
          </Stack>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
