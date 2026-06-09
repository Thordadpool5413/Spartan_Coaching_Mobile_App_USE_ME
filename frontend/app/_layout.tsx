import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { palette } from '../theme';

const ONBOARDING_KEY = 'onboarding_v1_complete';

function usePaymentDeepLink() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleUrl = (url: string) => {
      if (!url) return;
      try {
        const parsed = new URL(url);
        if (parsed.hostname === 'payment-success') {
          const sessionId = parsed.searchParams.get('session_id') || '';
          if (sessionId) {
            router.push({ pathname: '/payment-success', params: { session_id: sessionId } } as any);
          }
        }
      } catch {}
    };

    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    return () => sub.remove();
  }, [router]);
}

function useNotificationTap() {
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const url = typeof data?.url === 'string' ? data.url : null;
      if (url === '/drills') {
        router.push('/drills');
      }
    });
    return () => sub.remove();
  }, [router]);
}

function useOnboarding() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      if (!cancelled && !val) {
        router.replace('/onboarding' as any);
      }
    });
    return () => { cancelled = true; };
  }, [router]);
}

export default function RootLayout() {
  usePaymentDeepLink();
  useNotificationTap();
  useOnboarding();

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
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
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
            <Stack.Screen name="settings" options={{ title: 'Settings & Notifications' }} />
            <Stack.Screen name="admin" options={{ title: 'Admin' }} />
            <Stack.Screen name="payment-success" options={{ title: 'Booking Confirmation' }} />
            <Stack.Screen name="testimonials" options={{ title: 'Success Stories' }} />
            <Stack.Screen name="articles" options={{ title: 'Articles & Insights' }} />
            <Stack.Screen name="article-detail" options={{ headerShown: false }} />
            <Stack.Screen name="podcasts" options={{ title: 'Spartan Podcast' }} />
            <Stack.Screen name="resources" options={{ title: 'Resource Library' }} />
            <Stack.Screen name="programs" options={{ title: 'Training Programs' }} />
            <Stack.Screen name="legal" options={{ title: 'Legal & Compliance' }} />
          </Stack>
          <StatusBar style="light" />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
