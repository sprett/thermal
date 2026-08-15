import { Text, View } from 'react-native';

export default function MapScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-semibold text-foreground">Map</Text>
      <Text className="mt-1 text-base text-muted">The chart goes here.</Text>
    </View>
  );
}
