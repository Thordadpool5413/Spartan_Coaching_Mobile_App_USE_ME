import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIF_ENABLED_KEY = 'spartan_notif_enabled';
const NOTIF_HOUR_KEY = 'spartan_notif_hour';
const NOTIF_ID_KEY = 'spartan_notif_id';

export type NotifSettings = {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0/30
};

export async function getNotifSettings(): Promise<NotifSettings> {
  const [enabled, time] = await Promise.all([
    AsyncStorage.getItem(NOTIF_ENABLED_KEY),
    AsyncStorage.getItem(NOTIF_HOUR_KEY),
  ]);
  const [hStr, mStr] = (time || '8:0').split(':');
  return {
    enabled: enabled === '1',
    hour: parseInt(hStr, 10),
    minute: parseInt(mStr, 10) || 0,
  };
}

export async function setNotifSettings(s: NotifSettings) {
  await AsyncStorage.setItem(NOTIF_ENABLED_KEY, s.enabled ? '1' : '0');
  await AsyncStorage.setItem(NOTIF_HOUR_KEY, `${s.hour}:${s.minute}`);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const res = await Notification.requestPermission();
    return res === 'granted';
  }
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

export async function cancelDailyDrillReminder() {
  const id = await AsyncStorage.getItem(NOTIF_ID_KEY);
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignore
    }
    await AsyncStorage.removeItem(NOTIF_ID_KEY);
  }
}

export async function scheduleDailyDrillReminder(hour: number, minute: number): Promise<string | null> {
  await cancelDailyDrillReminder();

  if (Platform.OS === 'web') {
    // Web fallback: trigger an immediate test notification if permission granted; daily scheduling
    // requires Service Workers + Push API which are not configured in this Expo Web build.
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Spartan Coaching', {
          body: 'Daily drill reminders are set. (Open the app each day to keep your streak.)',
        });
      } catch {
        // ignore
      }
    }
    return 'web-stub';
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔥 Spartan Daily Drill',
      body: "Keep your streak alive — your 10-minute drill is ready.",
      sound: 'default',
      data: { url: '/drills' },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    } as any,
  });
  await AsyncStorage.setItem(NOTIF_ID_KEY, id);
  return id;
}

// Configure notification behavior so the alert shows even in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
