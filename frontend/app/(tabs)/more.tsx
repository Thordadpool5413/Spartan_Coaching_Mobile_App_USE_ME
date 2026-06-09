import React, { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing, typography } from '../../theme';
import { Card, PrimaryButton, GhostButton, H1, H2, H3, Body, Small, SectionLabel } from '../../components/UI';
import { submitContact } from '../../lib/api';

const SPARTAN_LOGO = require('../../assets/images/spartan-logo.png');

const NAV = [
  { route: '/about', icon: 'information-circle-outline' as const, title: 'About Spartan' },
  { route: '/services', icon: 'briefcase-outline' as const, title: 'Services & Pricing' },
  { route: '/programs', icon: 'school-outline' as const, title: 'Training Programs' },
  { route: '/testimonials', icon: 'chatbubbles-outline' as const, title: 'Success Stories' },
  { route: '/articles', icon: 'newspaper-outline' as const, title: 'Articles & Insights' },
  { route: '/podcasts', icon: 'mic-outline' as const, title: 'Spartan Podcast' },
  { route: '/resources', icon: 'folder-open-outline' as const, title: 'Resource Library' },
  { route: '/manifesto', icon: 'flame-outline' as const, title: 'The Spartan Ethos' },
  { route: '/compliance', icon: 'shield-checkmark-outline' as const, title: 'Compliance & Ethics' },
  { route: '/legal', icon: 'document-text-outline' as const, title: 'Legal Documents' },
  { route: '/faq', icon: 'help-circle-outline' as const, title: 'FAQ' },
  { route: '/settings', icon: 'notifications-outline' as const, title: 'Notifications & Settings' },
];

export default function MoreTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ interest?: string; message?: string }>();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    serviceInterest: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // Prefill from query params (e.g. user clicked "Request a Quote" on a service)
  useEffect(() => {
    const interest = typeof params.interest === 'string' ? params.interest : Array.isArray(params.interest) ? params.interest[0] : '';
    const message = typeof params.message === 'string' ? params.message : Array.isArray(params.message) ? params.message[0] : '';
    if (interest || message) {
      setForm((s) => ({
        ...s,
        serviceInterest: interest || s.serviceInterest,
        message: message || s.message,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.interest, params.message]);

  const update = (k: keyof typeof form) => (v: string) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      Alert.alert('Missing fields', 'Please fill in name, email, and a message.');
      return;
    }
    setSubmitting(true);
    try {
      await submitContact(form);
      setSent(true);
    } catch (e: any) {
      Alert.alert('Could not send', e?.response?.data?.detail || e.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, padding: spacing.l }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.l }}>
          <Image source={SPARTAN_LOGO} style={{ width: 80, height: 56 }} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <H1 style={{ fontSize: 26 }}>More</H1>
            <Small dim>About, services, contact</Small>
          </View>
        </View>

        {NAV.map((n) => (
          <Pressable
            key={n.route}
            testID={`more-nav-${n.route.replace('/', '')}`}
            onPress={() => router.push(n.route as any)}
            style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name={n.icon} size={22} color={palette.primary} />
            <Body style={{ flex: 1, fontWeight: '600' }}>{n.title}</Body>
            <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
          </Pressable>
        ))}

        {/* Contact Form */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionLabel>Get in Touch</SectionLabel>
          <H2 style={{ marginBottom: spacing.s }}>Contact Spartan Coaching</H2>
          <Body dim style={{ marginBottom: spacing.l }}>
            No pressure. No obligation. Just an honest conversation about where your team is and what would actually help.
          </Body>

          {sent ? (
            <Card>
              <View style={{ alignItems: 'center', padding: spacing.l }}>
                <View style={styles.successCircle}>
                  <Ionicons name="checkmark" size={28} color="#22c55e" />
                </View>
                <H3 style={{ marginTop: spacing.l, textAlign: 'center' }}>Message received</H3>
                <Body dim style={{ marginTop: spacing.s, textAlign: 'center' }}>
                  Nick will follow up at the email you provided. Usually within one business day.
                </Body>
                <GhostButton label="Send another" onPress={() => { setSent(false); setForm({ name: '', email: '', phone: '', company: '', serviceInterest: '', message: '' }); }} style={{ marginTop: spacing.l }} />
              </View>
            </Card>
          ) : (
            <Card>
              <Field testID="contact-name" label="Name *" value={form.name} onChangeText={update('name')} placeholder="Your name" />
              <Field testID="contact-email" label="Email *" value={form.email} onChangeText={update('email')} placeholder="you@example.com" keyboardType="email-address" />
              <Field testID="contact-phone" label="Phone" value={form.phone} onChangeText={update('phone')} placeholder="(optional)" keyboardType="phone-pad" />
              <Field testID="contact-company" label="Company / Hospice" value={form.company} onChangeText={update('company')} placeholder="(optional)" />
              <Field testID="contact-interest" label="Service Interest" value={form.serviceInterest} onChangeText={update('serviceInterest')} placeholder="e.g., Individual coaching, team workshop" />
              <Field testID="contact-message" label="Message *" value={form.message} onChangeText={update('message')} placeholder="Tell us about your team and what would help" multiline />

              <PrimaryButton
                testID="contact-submit"
                label={submitting ? 'Sending…' : 'Send message'}
                onPress={handleSubmit}
                disabled={submitting}
                icon={submitting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={14} color="#fff" />}
              />
            </Card>
          )}
        </View>

        <View style={{ marginTop: spacing.xxl, alignItems: 'center', gap: 6 }}>
          <Pressable onPress={() => WebBrowser.openBrowserAsync('https://www.linkedin.com/in/nicholas-lynch-coaching')}>
            <Small style={{ color: palette.primary, fontWeight: '700' }}>Connect with Nick on LinkedIn</Small>
          </Pressable>
          <Small dim style={{ textAlign: 'center' }}>© Spartan Coaching · spartanhospicecoaching.com</Small>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  testID?: string;
}) {
  return (
    <View style={{ marginBottom: spacing.m }}>
      <Small style={{ color: palette.text, fontWeight: '700', marginBottom: 6 }}>{label}</Small>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textFaint}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          styles.input,
          multiline && { minHeight: 100, textAlignVertical: 'top' as const, paddingTop: 12 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    padding: spacing.l,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    backgroundColor: palette.bgElev1,
    marginBottom: spacing.s,
  },
  input: {
    backgroundColor: palette.bgElev2,
    borderColor: palette.cardBorderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.text,
    fontSize: 15,
  },
  successCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
