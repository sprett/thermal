import { Text, View } from 'react-native';

export default function YouScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-semibold text-foreground">You</Text>
      <Text className="mt-1 text-base text-muted">The pilot profile goes here.</Text>
    </View>
  );
}
