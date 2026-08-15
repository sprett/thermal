import { Text, View } from 'react-native';

export default function FlyScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-semibold text-foreground">Fly</Text>
      <Text className="mt-1 text-base text-muted">The instrument goes here.</Text>
    </View>
  );
}
