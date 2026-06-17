import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { palette } from '../theme';
import CinematicSplash from '../components/CinematicSplash';

const ONBOARDING_KEY     = 'onboarding_v1_complete';
const TERMS_ACCEPTED_KEY = 'terms_accepted_v1';

function useDeepLinks() {
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
        } else if (parsed.hostname === 'subscription-success') {
          const sessionId = parsed.searchParams.get('session_id') || '';
          router.push({ pathname: '/subscription-success', params: { session_id: sessionId } } as any);
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
    const sub = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const url = typeof data?.url === 'string' ? data.url : null;
      if (url === '/drills') {
        router.push('/drills');
      }
    });
    return () => sub.remove();
  }, [router]);
}

/**
 * Runs the first-launch redirect flow only after the splash screen has
 * finished (splashDone = true). This prevents navigation firing mid-splash
 * which can cause a visible flash on slower devices.
 */
function useFirstLaunchFlow(splashDone: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!splashDone) return;
    let cancelled = false;
    (async () => {
      const [terms, onboarding] = await Promise.all([
        AsyncStorage.getItem(TERMS_ACCEPTED_KEY),
        AsyncStorage.getItem(ONBOARDING_KEY),
      ]);
      if (cancelled) return;
      if (!terms) {
        router.replace('/welcome' as any);
      } else if (!onboarding) {
        router.replace('/onboarding' as any);
      }
    })();
    return () => { cancelled = true; };
  }, [splashDone, router]);
}

const SHARED_HEADER = {
  headerStyle: { backgroundColor: palette.bg },
  headerTintColor: palette.primary,
  headerTitleStyle: { color: palette.text, fontWeight: '700' as const, fontSize: 17 },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: { backgroundColor: palette.bg },
} as const;

export default function RootLayout() {
  useDeepLinks();
  useNotificationTap();

  const [showSplash, setShowSplash] = useState(Platform.OS !== 'web');
  const [splashDone, setSplashDone] = useState(Platform.OS === 'web');

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
    setSplashDone(true);
  }, []);

  useFirstLaunchFlow(splashDone);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.bg }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: palette.bg }}>
          <Stack screenOptions={SHARED_HEADER}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />

            {/* Subscription screens — gesture-locked so users cannot swipe to dismiss */}
            <Stack.Screen
              name="paywall"
              options={{ headerShown: false, gestureEnabled: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="subscription-success"
              options={{ headerShown: false, gestureEnabled: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="team-checkout"
              options={{ title: 'Team Plan', gestureEnabled: false }}
            />

            {/* Standard push screens */}
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
            <Stack.Screen name="testimonials" options={{ title: 'Success Stories' }} />
            <Stack.Screen name="articles" options={{ title: 'Articles & Insights' }} />
            <Stack.Screen name="podcasts" options={{ title: 'Spartan Podcast' }} />
            <Stack.Screen name="resources" options={{ title: 'Resource Library' }} />
            <Stack.Screen name="programs" options={{ title: 'Training Programs' }} />

            {/* Modal presentations — sheet up from bottom */}
            <Stack.Screen
              name="payment-success"
              options={{ title: 'Booking Confirmation', presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="legal"
              options={{ title: 'Legal & Compliance', presentation: 'modal' }}
            />
            <Stack.Screen
              name="article-detail"
              options={{ headerShown: false, presentation: 'modal' }}
            />
          </Stack>
          <StatusBar style="light" />
          {showSplash && <CinematicSplash onComplete={handleSplashDone} />}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
