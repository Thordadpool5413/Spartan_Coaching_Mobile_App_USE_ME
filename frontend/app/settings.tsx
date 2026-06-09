import React, { useEffect, useState } from 'react';
import { ScrollView, View, Switch, Pressable, StyleSheet, Platform, Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, GhostButton, H1, H3, Body, Small, SectionLabel } from '../components/UI';
import {
  getNotifSettings,
  setNotifSettings,
  requestNotificationPermissions,
  scheduleDailyDrillReminder,
  cancelDailyDrillReminder,
  NotifSettings,
} from '../lib/notifications';
import { useSubscription, getSubscriptionPortalUrl, createSubscriptionCheckout, invalidateSubscriptionCache, fetchSubscriptionStatus, redeemTeamCode } from '../lib/subscription';

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
  const [permDenied, setPermDenied] = useState(false);
  const { tier, isActive, trialHoursLeft, stripeStatus, companyName, refresh: refreshSub } = useSubscription();
  const [subBusy, setSubBusy] = useState(false);

  // Team code redemption modal
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [teamCode, setTeamCode] = useState('');
  const [teamCodeBusy, setTeamCodeBusy] = useState(false);
  const [teamCodeError, setTeamCodeError] = useState<string | null>(null);
  const [teamCodeSuccess, setTeamCodeSuccess] = useState<string | null>(null);

  useEffect(() => {
    getNotifSettings().then(setSettings);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      setPermDenied(Notification.permission === 'denied');
    }
  }, []);

  const toggleEnable = async (val: boolean) => {
    setBusy(true);
    try {
      if (val) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          setPermDenied(true);
          Alert.alert(
            'Permission denied',
            Platform.OS === 'web'
              ? 'Your browser blocked notifications. Enable them in browser settings and try again.'
              : 'Enable notifications in your iOS Settings to receive daily drill reminders.',
          );
          setBusy(false);
          return;
        }
        setPermDenied(false);
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

        {permDenied && Platform.OS === 'web' ? (
          <Card style={{ marginTop: spacing.m, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: palette.primary + '40' }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Ionicons name="alert-circle" size={20} color={palette.primary} />
              <Small dim style={{ flex: 1 }}>
                Notifications are blocked in your browser settings. Open your browser&apos;s site settings to re-enable them, then toggle the reminder back on.
              </Small>
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
          <SectionLabel>Subscription</SectionLabel>
          <Card style={{ marginBottom: spacing.m }}>
            <View style={styles.toggleRow}>
              <LinearGradient
                colors={
                  tier === 'team'
                    ? [palette.success, '#059669']
                    : stripeStatus === 'active'
                    ? [palette.primary, palette.primaryDark]
                    : tier === 'trial' && isActive
                    ? [palette.discipline, '#1d4ed8']
                    : [palette.bgElev3, palette.bgElev3]
                }
                style={styles.subIcon}
              >
                <Ionicons
                  name={
                    tier === 'team'
                      ? 'people'
                      : stripeStatus === 'active'
                      ? 'sparkles'
                      : tier === 'trial' && isActive
                      ? 'time-outline'
                      : 'lock-closed-outline'
                  }
                  size={18}
                  color="#fff"
                />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <H3 style={{ fontSize: 16 }}>
                  {tier === 'team'
                    ? 'Team Member'
                    : stripeStatus === 'active'
                    ? 'Spartan Pro'
                    : stripeStatus === 'canceled'
                    ? 'Subscription Cancelled'
                    : tier === 'trial' && isActive
                    ? 'Free Trial'
                    : 'Trial Ended'}
                </H3>
                <Small dim>
                  {tier === 'team'
                    ? companyName ? `${companyName} · Team access active` : 'Team access active'
                    : stripeStatus === 'active'
                    ? 'Active · $39.99/month'
                    : stripeStatus === 'canceled'
                    ? 'Resubscribe to restore AI access'
                    : tier === 'trial' && isActive
                    ? `${trialHoursLeft}h left in your free trial`
                    : 'Subscribe to unlock AI coaching'}
                </Small>
              </View>
            </View>

            <View style={{ marginTop: spacing.l, gap: spacing.s }}>
              {tier === 'team' ? (
                <View style={[styles.teamBadge]}>
                  <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                  <Small style={{ color: palette.success, fontWeight: '600', flex: 1 }}>
                    All AI features unlocked via team license
                  </Small>
                </View>
              ) : stripeStatus === 'active' || stripeStatus === 'canceled' ? (
                <>
                  <PrimaryButton
                    label={subBusy ? 'Opening…' : stripeStatus === 'canceled' ? 'Resubscribe — $39.99/mo' : 'Manage Subscription'}
                    disabled={subBusy}
                    onPress={async () => {
                      if (stripeStatus === 'canceled') {
                        router.push('/paywall' as any);
                        return;
                      }
                      setSubBusy(true);
                      try {
                        const url = await getSubscriptionPortalUrl();
                        await WebBrowser.openBrowserAsync(url);
                        refreshSub();
                      } catch {
                        Alert.alert('Error', 'Could not open subscription portal. Please try again.');
                      } finally {
                        setSubBusy(false);
                      }
                    }}
                    icon={subBusy ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name={stripeStatus === 'canceled' ? 'sparkles' : 'open-outline'} size={14} color="#fff" />}
                  />
                  {stripeStatus === 'active' && (
                    <GhostButton
                      label="Billing portal"
                      onPress={async () => {
                        setSubBusy(true);
                        try {
                          const url = await getSubscriptionPortalUrl();
                          await WebBrowser.openBrowserAsync(url);
                          refreshSub();
                        } catch {
                          Alert.alert('Error', 'Could not open billing portal.');
                        } finally {
                          setSubBusy(false);
                        }
                      }}
                    />
                  )}
                </>
              ) : (
                <PrimaryButton
                  label={subBusy ? 'Opening…' : 'Unlock Pro — $39.99/mo'}
                  disabled={subBusy}
                  onPress={() => router.push('/paywall' as any)}
                  icon={<Ionicons name="sparkles" size={14} color="#fff" />}
                />
              )}
            </View>
          </Card>

          {tier !== 'team' && (
            <>
              <Pressable
                onPress={() => {
                  setTeamCode('');
                  setTeamCodeError(null);
                  setTeamCodeSuccess(null);
                  setTeamModalVisible(true);
                }}
                style={({ pressed }) => [styles.teamCodeRow, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="key-outline" size={18} color={palette.textMuted} />
                <Small dim style={{ flex: 1 }}>Have a team code?</Small>
                <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
              </Pressable>

              <Pressable
                onPress={() => router.push('/team-checkout' as any)}
                style={({ pressed }) => [styles.teamCodeRow, { marginTop: spacing.s, opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="business-outline" size={18} color={palette.textMuted} />
                <Small dim style={{ flex: 1 }}>Buy a team license for your organization</Small>
                <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
              </Pressable>
            </>
          )}
        </View>

        {/* Team Code Redemption Modal */}
        <Modal
          visible={teamModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setTeamModalVisible(false)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <Pressable style={styles.modalOverlay} onPress={() => setTeamModalVisible(false)}>
              <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHandle} />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.l }}>
                  <View style={styles.modalIcon}>
                    <Ionicons name="key" size={20} color={palette.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <H3 style={{ fontSize: 17 }}>Redeem Team Code</H3>
                    <Small dim>Enter the code from your employer</Small>
                  </View>
                  <Pressable onPress={() => setTeamModalVisible(false)}>
                    <Ionicons name="close" size={22} color={palette.textMuted} />
                  </Pressable>
                </View>

                {teamCodeSuccess ? (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle" size={32} color={palette.success} style={{ marginBottom: spacing.s }} />
                    <Small style={{ color: palette.success, fontWeight: '700', fontSize: 15, textAlign: 'center', marginBottom: spacing.xs }}>
                      Team access activated
                    </Small>
                    <Small dim style={{ textAlign: 'center' }}>{teamCodeSuccess}</Small>
                    <PrimaryButton
                      label="Done"
                      onPress={() => setTeamModalVisible(false)}
                      style={{ marginTop: spacing.l }}
                    />
                  </View>
                ) : (
                  <>
                    <TextInput
                      value={teamCode}
                      onChangeText={(t) => {
                        setTeamCode(t.toUpperCase());
                        setTeamCodeError(null);
                      }}
                      placeholder="SPARTAN-DELTA-4K"
                      placeholderTextColor={palette.textFaint}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      style={[styles.codeInput, teamCodeError ? styles.codeInputError : null]}
                    />

                    {teamCodeError && (
                      <View style={styles.errorRow}>
                        <Ionicons name="alert-circle-outline" size={14} color={palette.primary} />
                        <Small style={{ color: palette.primary, flex: 1 }}>{teamCodeError}</Small>
                      </View>
                    )}

                    <PrimaryButton
                      label={teamCodeBusy ? 'Verifying…' : 'Redeem'}
                      disabled={teamCodeBusy || teamCode.trim().length < 5}
                      onPress={async () => {
                        setTeamCodeBusy(true);
                        setTeamCodeError(null);
                        try {
                          const result = await redeemTeamCode(teamCode);
                          refreshSub();
                          setTeamCodeSuccess(
                            result.companyName
                              ? `${result.companyName} · ${result.seatsRemaining} seat${result.seatsRemaining !== 1 ? 's' : ''} remaining`
                              : `${result.seatsRemaining} seat${result.seatsRemaining !== 1 ? 's' : ''} remaining on this license`
                          );
                        } catch (err: any) {
                          const msg = err?.response?.data?.detail || 'Invalid or expired team code.';
                          setTeamCodeError(msg);
                        } finally {
                          setTeamCodeBusy(false);
                        }
                      }}
                      icon={teamCodeBusy ? <ActivityIndicator color="#fff" size="small" /> : undefined}
                      style={{ marginTop: spacing.m }}
                    />

                    <GhostButton
                      label="Cancel"
                      onPress={() => setTeamModalVisible(false)}
                      style={{ marginTop: spacing.s }}
                    />
                  </>
                )}
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>

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
  subIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 4,
  },
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
  teamBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: radius.md, padding: spacing.m,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
  },
  teamCodeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: spacing.l, paddingVertical: spacing.m,
    borderRadius: radius.md, backgroundColor: palette.bgElev1,
    borderWidth: 1, borderColor: palette.cardBorder,
    marginBottom: spacing.xs,
  },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: palette.bgElev1,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, paddingBottom: 40,
    borderWidth: 1, borderColor: palette.cardBorder,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: palette.bgElev3, alignSelf: 'center',
    marginBottom: spacing.l,
  },
  modalIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: palette.primaryTint,
    borderWidth: 1, borderColor: palette.primary + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  codeInput: {
    backgroundColor: palette.bgElev2,
    borderWidth: 1, borderColor: palette.cardBorder,
    borderRadius: radius.md, padding: spacing.l,
    color: palette.text,
    fontSize: 20, fontWeight: '700', letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  codeInputError: {
    borderColor: palette.primary,
    backgroundColor: palette.primaryTint,
  },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: spacing.s,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
});
