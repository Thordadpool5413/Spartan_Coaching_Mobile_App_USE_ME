import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { palette, radius, spacing } from '../theme';
import { Card, PrimaryButton, GhostButton, H1, H3, Body, Small, SectionLabel } from '../components/UI';
import { createTeamCheckout } from '../lib/subscription';

const TIERS = [
  {
    seats: 5 as const,
    price: '$149',
    period: '/month',
    label: '5-Seat Team License',
    perSeat: '$29.80/seat',
    features: [
      'All AI coaching tools unlocked',
      'Ask Spartan · Chat · Objection Handler',
      'Playbook Generator · Role-Play · Eligibility',
      'Single team code distributed to 5 reps',
      'Cancel or change anytime',
    ],
    highlight: false,
  },
  {
    seats: 10 as const,
    price: '$249',
    period: '/month',
    label: '10-Seat Team License',
    perSeat: '$24.90/seat',
    features: [
      'Everything in the 5-seat plan',
      '10 rep seats — best per-seat value',
      'Single team code distributed to 10 reps',
      'Priority email support',
      'Cancel or change anytime',
    ],
    highlight: true,
  },
];

function resolveOrigin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  const backendUrl =
    (Constants.expoConfig?.extra?.backendUrl as string | undefined) ||
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    '';
  return backendUrl || 'spartan://';
}

export default function TeamCheckoutScreen() {
  const router = useRouter();
  const [pendingSeats, setPendingSeats] = useState<null | 5 | 10>(null);
  const [busy, setBusy] = useState(false);

  // Pre-checkout form state
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [formError, setFormError] = useState('');

  const handleSelect = (seats: 5 | 10) => {
    setFormError('');
    setPendingSeats(seats);
  };

  const handleConfirm = async () => {
    const company = companyName.trim();
    const email = contactEmail.trim();
    if (!company) { setFormError('Please enter your company or organization name.'); return; }
    if (!email || !email.includes('@')) { setFormError('Please enter a valid email address.'); return; }
    if (!pendingSeats) return;

    setBusy(true);
    setFormError('');
    try {
      const origin = resolveOrigin();
      const url = await createTeamCheckout(pendingSeats, origin, company, email);
      setPendingSeats(null);
      await WebBrowser.openBrowserAsync(url);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Could not open checkout. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.l }}
        >
          <Ionicons name="chevron-back" size={20} color={palette.textDim} />
          <Small dim>Back</Small>
        </Pressable>

        <SectionLabel>For Employers</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Team License</H1>
        <Body dim style={{ marginBottom: spacing.xxl, lineHeight: 22 }}>
          One subscription, one team code. Your reps enter the code in the app for instant Pro access — no individual credit cards required.
        </Body>

        {TIERS.map((tier) => (
          <View key={tier.seats} style={{ marginBottom: spacing.l }}>
            {tier.highlight && (
              <View style={styles.bestValueBadge}>
                <Small style={{ color: palette.warn, fontWeight: '700', fontSize: 11, letterSpacing: 0.8 }}>
                  BEST VALUE
                </Small>
              </View>
            )}
            <Card
              style={[
                styles.tierCard,
                tier.highlight && styles.tierCardHighlight,
              ]}
            >
              <View style={styles.tierHeader}>
                <LinearGradient
                  colors={tier.highlight ? [palette.primary, palette.primaryDark] : [palette.bgElev3, palette.bgElev2]}
                  style={styles.tierIcon}
                >
                  <Ionicons
                    name={tier.highlight ? 'people' : 'person'}
                    size={20}
                    color={tier.highlight ? '#fff' : palette.textDim}
                  />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <H3 style={{ fontSize: 16 }}>{tier.label}</H3>
                  <Small dim>{tier.perSeat}</Small>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Body style={{ fontSize: 26, fontWeight: '800', color: palette.text }}>
                    {tier.price}
                  </Body>
                  <Small dim>{tier.period}</Small>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={{ gap: spacing.s, marginBottom: spacing.l }}>
                {tier.features.map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <Ionicons name="checkmark-circle" size={16} color={palette.success} style={{ marginTop: 2 }} />
                    <Small style={{ flex: 1, color: palette.textDim, lineHeight: 20 }}>{f}</Small>
                  </View>
                ))}
              </View>

              <PrimaryButton
                label={`Get ${tier.seats} Seats — ${tier.price}/mo`}
                onPress={() => handleSelect(tier.seats)}
                icon={<Ionicons name="open-outline" size={14} color="#fff" />}
                style={!tier.highlight ? styles.ghostLike : undefined}
              />
            </Card>
          </View>
        ))}

        <Card style={styles.quoteCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.m }}>
            <View style={styles.quoteIcon}>
              <Ionicons name="mail-outline" size={20} color={palette.primary} />
            </View>
            <H3 style={{ fontSize: 16 }}>Need more than 10 seats?</H3>
          </View>
          <Body dim style={{ marginBottom: spacing.l, lineHeight: 22 }}>
            For larger teams or custom enterprise arrangements, reach out and we'll build a plan that fits your organization.
          </Body>
          <GhostButton
            label="Request a Quote"
            onPress={() => router.push('/programs' as any)}
            icon={<Ionicons name="arrow-forward" size={14} color={palette.text} />}
          />
        </Card>

        <View style={{ marginTop: spacing.xxl, gap: spacing.s }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="shield-checkmark-outline" size={14} color={palette.textMuted} />
            <Small dim>Secure checkout via Stripe. Cancel anytime.</Small>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="key-outline" size={14} color={palette.textMuted} />
            <Small dim>Your team code arrives by email immediately after purchase.</Small>
          </View>
        </View>
      </ScrollView>

      {/* Pre-checkout form modal */}
      <Modal
        visible={pendingSeats !== null}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!busy) setPendingSeats(null); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => { if (!busy) setPendingSeats(null); }}
          >
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalHandle} />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.s }}>
                <View style={styles.modalIcon}>
                  <Ionicons name="people-outline" size={20} color={palette.primary} />
                </View>
                <View>
                  <H3 style={{ fontSize: 16 }}>Almost there</H3>
                  <Small dim>
                    {pendingSeats}-seat license · {pendingSeats === 5 ? '$149' : '$249'}/month
                  </Small>
                </View>
              </View>

              <Body dim style={{ marginBottom: spacing.l, lineHeight: 22, fontSize: 13 }}>
                We'll email your team code to this address immediately after payment.
              </Body>

              <Small style={styles.fieldLabel}>Company / Organization name</Small>
              <TextInput
                style={styles.input}
                placeholder="Acme Hospice"
                placeholderTextColor={palette.textMuted}
                value={companyName}
                onChangeText={setCompanyName}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Small style={[styles.fieldLabel, { marginTop: spacing.m }]}>Email for your team code</Small>
              <TextInput
                style={styles.input}
                placeholder="you@company.com"
                placeholderTextColor={palette.textMuted}
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
              />

              {formError ? (
                <Small style={{ color: palette.error || palette.primary, marginTop: spacing.s }}>{formError}</Small>
              ) : null}

              <View style={{ gap: spacing.s, marginTop: spacing.l }}>
                <PrimaryButton
                  label={busy ? 'Opening checkout…' : 'Continue to Checkout'}
                  onPress={handleConfirm}
                  disabled={busy}
                  icon={
                    busy
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Ionicons name="open-outline" size={14} color="#fff" />
                  }
                />
                <GhostButton
                  label="Cancel"
                  onPress={() => { if (!busy) setPendingSeats(null); }}
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tierCard: {
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
  tierCardHighlight: {
    borderColor: palette.primary + '60',
    backgroundColor: 'rgba(239,68,68,0.04)',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.l,
  },
  tierIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: palette.divider,
    marginBottom: spacing.l,
  },
  bestValueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.warnDim,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: palette.warn + '40',
  },
  quoteCard: {
    marginTop: spacing.m,
    borderColor: palette.cardBorder,
  },
  quoteIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: palette.primaryTint,
    borderWidth: 1,
    borderColor: palette.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLike: {
    backgroundColor: palette.bgElev2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: palette.bgElev1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.l,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: palette.cardBorder,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: palette.bgElev3,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.l,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: palette.primaryTint,
    borderWidth: 1,
    borderColor: palette.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    color: palette.textDim,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: palette.bgElev2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.text,
    fontSize: 16,
  },
});
