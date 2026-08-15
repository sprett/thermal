import { Text, View } from 'react-native';

export default function FlightsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-semibold text-foreground">Flights</Text>
      <Text className="mt-1 text-base text-muted">The logbook goes here.</Text>
    </View>
  );
}
