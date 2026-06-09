import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { Card, GhostButton, H1, H3, Body, Small, SectionLabel } from '../components/UI';

const PRIVACY_POLICY_URL = 'https://spartanhospicecoaching.com/privacy';
const TERMS_URL = 'https://spartanhospicecoaching.com/terms';

type LegalSection = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  summary: string;
  bullets: string[];
};

const SECTIONS: LegalSection[] = [
  {
    id: 'privacy',
    icon: 'lock-closed',
    title: 'Privacy Policy',
    summary:
      'Spartan Coaching collects only the information needed to deliver coaching services and respond to inquiries — your name, email, company, and the questions you ask.',
    bullets: [
      'We never sell, rent, or trade your personal data.',
      'We use Resend to send transactional email and a PostgreSQL database to store contact submissions.',
      'AI conversations through the app are processed by OpenAI under our enterprise terms; no PHI is stored or transmitted.',
      'You may request deletion of any personal data we hold by emailing nick@spartanhospicecoaching.com.',
      'We use device-scoped IDs (not personal identifiers) to track drill streaks; no account required.',
    ],
  },
  {
    id: 'terms',
    icon: 'document-text',
    title: 'Terms of Service',
    summary:
      'Use of the Spartan Coaching app and any coaching engagement is governed by these terms. By using the app you agree to them.',
    bullets: [
      'Content in the app (drills, knowledge base, role-play, articles) is for educational use by hospice sales professionals.',
      'AI-generated coaching is a tool, not a substitute for your judgment or your compliance officer.',
      'Coaching engagements (paid sessions) are governed by a separate written services agreement.',
      'You agree not to use the app to share PHI, defame third parties, or circumvent rate limits.',
      'We may update these terms with notice on this screen; continued use means acceptance.',
    ],
  },
  {
    id: 'disclaimer',
    icon: 'warning',
    title: 'Disclaimer',
    summary:
      'The app provides general hospice sales coaching information. It is not legal, medical, or compliance advice.',
    bullets: [
      'Always confirm Medicare eligibility criteria with your clinical and compliance teams.',
      'Sample scripts and emails are starting points, not approved templates for your organization.',
      'AI tools can make mistakes — verify clinical facts before sharing them with referral sources.',
      'Spartan Coaching is not affiliated with CMS, Medicare, or any government agency.',
    ],
  },
  {
    id: 'hipaa-baa',
    icon: 'shield-checkmark',
    title: 'HIPAA & BAA',
    summary:
      'Spartan Coaching is HIPAA-aware by design. We do not store, process, or transmit Protected Health Information through the app.',
    bullets: [
      'The Eligibility Quick Check is anonymous — no patient identifiers are collected or stored.',
      'AI conversations are processed under our enterprise OpenAI agreement with no training-data retention.',
      'For corporate engagements that touch PHI, a Business Associate Agreement (BAA) is available — request it from the Services screen.',
      'All Resend email communications go to nick@spartanhospicecoaching.com and are retained per Resend\'s standard policy.',
    ],
  },
  {
    id: 'nda',
    icon: 'eye-off',
    title: 'Mutual NDA (engagements)',
    summary:
      'For consulting and coaching engagements, Spartan Coaching and the client mutually protect confidential information shared during the engagement.',
    bullets: [
      'Confidential information includes financials, account lists, performance data, and proprietary processes.',
      'No party will disclose the other\'s confidential information except to comply with law or with written permission.',
      'Confidentiality survives for 3 years after engagement termination.',
      'Aggregate, de-identified case-study results may be shared in marketing only with written approval (see Testimonial Release).',
    ],
  },
  {
    id: 'liability',
    icon: 'hand-right',
    title: 'Liability & Indemnification',
    summary:
      'Spartan Coaching\'s liability is limited to the fees paid for the specific engagement giving rise to a claim.',
    bullets: [
      'We do not guarantee specific referral, admission, or revenue outcomes — coaching is one input, execution is the client\'s.',
      'You agree to indemnify Spartan Coaching for misuse of materials or violation of HIPAA / Anti-Kickback rules in your organization.',
      'Each party maintains its own professional liability and cyber insurance.',
      'Disputes are governed by the laws of the engagement\'s home state and resolved by binding arbitration.',
    ],
  },
  {
    id: 'conflict',
    icon: 'git-branch',
    title: 'Conflict of Interest',
    summary:
      'Spartan Coaching discloses any potential conflicts before an engagement begins.',
    bullets: [
      'Nick Lynch may coach multiple hospices in adjacent geographic markets — never in directly overlapping territories without written consent.',
      'No referral fees, kickbacks, or revenue-sharing arrangements with technology vendors, EMRs, or competing providers.',
      'Any pre-existing relationship with a referral source named in the engagement will be disclosed in writing.',
    ],
  },
];

export default function LegalScreen() {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>('privacy');

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        <SectionLabel>Legal & Compliance</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Plain-English summaries</H1>
        <Body dim style={{ marginBottom: spacing.l }}>
          Tap any section to expand. For the signed long-form versions (NDA, services contract, BAA, testimonial release), email{' '}
          <Small style={{ color: palette.primary, fontWeight: '700' }}>nick@spartanhospicecoaching.com</Small> and we will send the executable PDFs.
        </Body>

        {SECTIONS.map((s) => {
          const isOpen = open === s.id;
          return (
            <Card key={s.id} style={{ marginBottom: spacing.m }} testID={`legal-${s.id}`}>
              <Pressable
                onPress={() => setOpen(isOpen ? null : s.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={s.icon} size={20} color={palette.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <H3>{s.title}</H3>
                  {!isOpen && <Small dim style={{ marginTop: 2 }}>Tap to read</Small>}
                </View>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={palette.textMuted}
                />
              </Pressable>
              {isOpen && (
                <View style={{ marginTop: spacing.m }}>
                  <Body dim style={{ marginBottom: spacing.m }}>{s.summary}</Body>
                  {s.bullets.map((b, i) => (
                    <View key={i} style={styles.bullet}>
                      <Ionicons name="checkmark-circle" size={14} color={palette.primary} />
                      <Body style={{ flex: 1, fontSize: 14 }}>{b}</Body>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          );
        })}

        <View style={{ marginTop: spacing.l, gap: spacing.m }}>
          <Pressable
            testID="legal-privacy-url"
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
            style={styles.privacyLink}
          >
            <Ionicons name="globe-outline" size={16} color={palette.primary} />
            <Small style={{ color: palette.primary, fontWeight: '600' }}>
              View full Privacy Policy online
            </Small>
            <Ionicons name="open-outline" size={14} color={palette.primary} />
          </Pressable>
          <Pressable
            testID="legal-terms-url"
            onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}
            style={styles.privacyLink}
          >
            <Ionicons name="document-text-outline" size={16} color={palette.primary} />
            <Small style={{ color: palette.primary, fontWeight: '600' }}>
              View full Terms of Service online
            </Small>
            <Ionicons name="open-outline" size={14} color={palette.primary} />
          </Pressable>
          <GhostButton
            testID="legal-contact"
            label="Request full documents"
            onPress={() =>
              router.push({
                pathname: '/(tabs)/more',
                params: {
                  interest: 'Legal Documents Request',
                  message: 'Please send the long-form legal documents (NDA, services contract, BAA, etc.) so we can review them with our compliance team.',
                },
              } as any)
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bullet: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: spacing.s,
  },
});
