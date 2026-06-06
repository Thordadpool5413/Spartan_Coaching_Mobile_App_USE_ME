import React, { useEffect, useState } from 'react';
import { ScrollView, View, Switch, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, GhostButton, H1, H2, H3, Body, Small, SectionLabel } from '../components/UI';
import {
  getNotifSettings,
  setNotifSettings,
  requestNotificationPermissions,
  scheduleDailyDrillReminder,
  cancelDailyDrillReminder,
  NotifSettings,
} from '../lib/notifications';

const TIME_OPTIONS = [
  { h: 6, m: 0, label: '6:00 AM' },
  { h: 7, m: 0, label: '7:00 AM' },
  { h: 7, m: 30, label: '7:30 AM' },
  { h: 8, m: 0, label: '8:00 AM' },
  { h: 8, m: 30, label: '8:30 AM' },
  { h: 9, m: 0, label: '9:00 AM' },
  { h: 12, m: 0, label: '12:00 PM' },
  { h: 17, m: 0, label: '5:00 PM' },
  { h: 20, m: 0, label: '8:00 PM' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotifSettings>({ enabled: false, hour: 8, minute: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getNotifSettings().then(setSettings);
  }, []);

  const toggleEnable = async (val: boolean) => {
    setBusy(true);
    try {
      if (val) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert(
            'Permission denied',
            Platform.OS === 'web'
              ? 'Your browser blocked notifications. Enable them in browser settings and try again.'
              : 'Enable notifications in your iOS Settings to receive daily drill reminders.',
          );
          setBusy(false);
          return;
        }
        await scheduleDailyDrillReminder(settings.hour, settings.minute);
      } else {
        await cancelDailyDrillReminder();
      }
      const next = { ...settings, enabled: val };
      await setNotifSettings(next);
      setSettings(next);
    } finally {
      setBusy(false);
    }
  };

  const pickTime = async (h: number, m: number) => {
    setBusy(true);
    try {
      const next = { ...settings, hour: h, minute: m };
      await setNotifSettings(next);
      setSettings(next);
      if (settings.enabled) {
        await scheduleDailyDrillReminder(h, m);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        <SectionLabel>Settings</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Notifications</H1>
        <Body dim style={{ marginBottom: spacing.l }}>
          Daily nudges that keep your streak alive without becoming noise. One reminder, one time, your choice.
        </Body>

        <Card style={{ marginBottom: spacing.l }}>
          <View style={styles.toggleRow}>
            <View style={[styles.iconWrap, { backgroundColor: palette.primaryTint }]}>
              <Ionicons name="flame" size={20} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <H3 style={{ fontSize: 16 }}>Daily Drill Reminder</H3>
              <Small dim>One push per day to surface today&apos;s drill.</Small>
            </View>
            <Switch
              testID="notif-toggle"
              value={settings.enabled}
              onValueChange={toggleEnable}
              disabled={busy}
              trackColor={{ false: palette.bgElev3, true: palette.primary + '60' }}
              thumbColor={settings.enabled ? palette.primary : palette.textMuted}
            />
          </View>
        </Card>

        {settings.enabled ? (
          <Card>
            <H3 style={{ marginBottom: spacing.s, fontSize: 16 }}>Reminder time</H3>
            <Small dim style={{ marginBottom: spacing.m }}>Pick the time of day that fits your routine.</Small>
            <View style={styles.timeGrid}>
              {TIME_OPTIONS.map((t) => {
                const active = settings.hour === t.h && settings.minute === t.m;
                return (
                  <Pressable
                    key={t.label}
                    testID={`time-${t.h}-${t.m}`}
                    onPress={() => pickTime(t.h, t.m)}
                    style={({ pressed }) => [
                      styles.timeChip,
                      active && styles.timeChipActive,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Body style={[{ fontWeight: '700', fontSize: 14 }, active && { color: '#fff' }]}>
                      {t.label}
                    </Body>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ) : null}

        {Platform.OS === 'web' ? (
          <Card style={{ marginTop: spacing.l, backgroundColor: palette.warnDim, borderColor: palette.warn + '40' }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Ionicons name="information-circle" size={20} color={palette.warn} />
              <Small dim style={{ flex: 1 }}>
                You&apos;re running the app in a web browser. Browser notifications work while the browser is open but daily background notifications require the native iOS app (TestFlight build).
              </Small>
            </View>
          </Card>
        ) : null}

        <View style={{ marginTop: spacing.xxl }}>
          <SectionLabel>About this app</SectionLabel>
          <Card style={{ marginBottom: spacing.m }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <LinearGradient colors={[palette.primary, palette.primaryDark]} style={styles.aboutIcon}>
                <Ionicons name="information-circle" size={20} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <H3 style={{ fontSize: 16 }}>Spartan Coaching</H3>
                <Small dim>Version 1.0.0 · iOS</Small>
              </View>
            </View>
          </Card>
          <Pressable
            onPress={() => router.push('/admin')}
            style={({ pressed }) => [styles.adminLink, { opacity: pressed ? 0.7 : 1 }]}
            testID="admin-link"
          >
            <Ionicons name="key-outline" size={18} color={palette.textMuted} />
            <Small dim style={{ flex: 1 }}>Admin access</Small>
            <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.md, borderWidth: 1,
    borderColor: palette.cardBorder, backgroundColor: palette.bgElev2,
  },
  timeChipActive: { borderColor: palette.primary, backgroundColor: palette.primary },
  aboutIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  adminLink: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: spacing.l, paddingVertical: spacing.m,
    borderRadius: radius.md, backgroundColor: palette.bgElev1,
    borderWidth: 1, borderColor: palette.cardBorder,
  },
});
