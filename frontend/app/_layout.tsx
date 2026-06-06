import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { palette } from '../theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.bg }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: palette.bg }}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: palette.bg },
              headerTintColor: palette.text,
              headerTitleStyle: { color: palette.text, fontWeight: '800' },
              contentStyle: { backgroundColor: palette.bg },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="ask" options={{ title: 'Ask a Hospice Expert' }} />
            <Stack.Screen name="chat" options={{ title: 'Coach Chat' }} />
            <Stack.Screen name="objection" options={{ title: 'Objection Handler' }} />
            <Stack.Screen name="playbook" options={{ title: 'Playbook Generator' }} />
            <Stack.Screen name="roleplay" options={{ title: 'Role-Play Practice' }} />
            <Stack.Screen name="roleplay-session" options={{ title: 'Practice Session' }} />
            <Stack.Screen name="drills" options={{ title: 'Daily Drills' }} />
            <Stack.Screen name="knowledge" options={{ title: 'Knowledge Base' }} />
            <Stack.Screen name="about" options={{ title: 'About Spartan' }} />
            <Stack.Screen name="services" options={{ title: 'Services & Pricing' }} />
            <Stack.Screen name="manifesto" options={{ title: 'The Spartan Ethos' }} />
            <Stack.Screen name="compliance" options={{ title: 'Compliance & Ethics' }} />
            <Stack.Screen name="faq" options={{ title: 'FAQ' }} />
            <Stack.Screen name="eligibility" options={{ title: 'Eligibility Quick Check' }} />
          </Stack>
          <StatusBar style="light" />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
