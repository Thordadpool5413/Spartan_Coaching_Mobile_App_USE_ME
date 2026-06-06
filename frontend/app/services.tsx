import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, spacing } from '../theme';
import {
  Card,
  PrimaryButton,
  GhostButton,
  H1,
  H2,
  H3,
  Body,
  Small,
  SectionLabel,
} from '../components/UI';
import { createCheckout } from '../lib/api';

// ---------- Service definitions ----------
type Service = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  price: string;
  cadence?: string;
  problem: string;
  solution: string;
  included: string[];
  outcome: string;
  /** If set, shows a "Book & Pay" button that opens the Stripe checkout flow. */
  packages?: { id: 'coaching_30' | 'coaching_60'; label: string; amount: number }[];
  /** Service interest tag prefilled when user requests a quote. */
  quoteTag: string;
};

const INDIVIDUAL_SERVICES: Service[] = [
  {
    icon: 'videocam',
    title: 'Virtual Coaching Sessions',
    price: '$40 / $70',
    cadence: '30 or 60 minutes',
    problem:
      "You're stuck on a specific challenge, an objection you can't handle, a territory that isn't producing, or a referral partner who won't commit.",
    solution:
      "Get targeted, real-time coaching to break through the exact obstacle holding you back. No wasted time on theory you already know, just focused work on the one thing stopping you from moving forward right now.",
    included: [
      'Prep form to identify the exact problem',
      'Live session with role-play and real scenarios',
      'One-page action plan for immediate implementation',
      'Recording for review (60 min sessions)',
    ],
    outcome:
      'Walk away with a clear next step you can execute Tuesday morning. Better execution means fewer stalled referrals, and fewer stalled referrals means more patients receive care when they need it.',
    packages: [
      { id: 'coaching_30', label: '30-min session — $40', amount: 40 },
      { id: 'coaching_60', label: '60-min session — $70', amount: 70 },
    ],
    quoteTag: 'Virtual Coaching Sessions',
  },
  {
    icon: 'map',
    title: 'Territory Management Coaching',
    price: 'Custom pricing',
    cadence: '2–3 sessions',
    problem: "Your calendar is full but your pipeline isn't moving. You're busy but not productive.",
    solution:
      'Stop the chaos. Build a territory system that tells you exactly where to go, who to see, and when to follow up, so you spend time on accounts that actually convert instead of spinning your wheels on low-value visits.',
    included: [
      "Territory analysis: who refers, who should, who's wasting your time",
      'Account prioritization system (A/B/C classification)',
      'Weekly routing plan for maximum efficiency',
      'Follow-up cadence that prevents dropped balls',
    ],
    outcome:
      'Spend less time driving, more time with decision-makers who can say yes. Focused reps reach the right people more often, and more of the right conversations lead to patients getting referred.',
    quoteTag: 'Territory Management Coaching',
  },
];

const LEADERSHIP_SERVICES: Service[] = [
  {
    icon: 'people',
    title: 'Team Training Workshops',
    price: 'Custom pricing',
    cadence: '1–2 days',
    problem:
      "Your team knows they should be doing better, but they don't have a shared system. Everyone's running their own playbook.",
    solution:
      'Give your entire team the same language, the same process, and the same skills, so they can coach each other, hold themselves accountable, and execute consistently without you micromanaging every interaction.',
    included: [
      'Customized curriculum based on your market and challenges',
      'Live practice with objection handling and discovery',
      'Territory planning workshop with real accounts',
      'Written playbook your team can reference daily',
    ],
    outcome:
      'Your team speaks the same language, uses the same process, and coaches each other up. Consistent teams generate consistent referrals, and consistent referrals mean fewer eligible patients go unserved.',
    quoteTag: 'Team Training Workshops',
  },
  {
    icon: 'star',
    title: 'Leadership Coaching',
    price: 'Custom pricing',
    cadence: 'Monthly or quarterly',
    problem:
      "You're managing by results instead of coaching to behaviors. When numbers are down, you don't know what to fix.",
    solution:
      'Transform from firefighting to coaching. Learn to diagnose performance gaps, coach one skill at a time, and build a weekly rhythm that develops your team\'s capability instead of just chasing this month\'s numbers.',
    included: [
      '1:1 coaching on skill-based management',
      'Pipeline review framework that drives action',
      'Weekly huddle structure (5 minutes that matter)',
      'Scorecard design: what to measure, how to use it',
    ],
    outcome:
      'You will know what good looks like, how to spot it, and how to coach your team to it. Leaders who develop people build teams that serve more patients at a higher standard.',
    quoteTag: 'Leadership Coaching',
  },
  {
    icon: 'trending-up',
    title: 'Growth Strategy Consulting',
    price: 'Custom pricing',
    cadence: '3–6 months',
    problem: "You're not sure where growth will come from. You need a plan that's specific, not aspirational.",
    solution:
      "Stop guessing. Get a clear roadmap showing exactly where referrals should come from, which accounts to prioritize, and what needs to change in your sales process to capture the opportunities you're currently missing.",
    included: [
      'Market analysis: diagnosis mix, competitor positioning, referral patterns',
      'Growth opportunity identification (untapped accounts, diagnosis gaps)',
      'Sales process redesign for faster conversions',
      'Quarterly reviews to track progress and adjust',
    ],
    outcome:
      'A repeatable system for growth that does not depend on hope or heroics. Sustainable growth means more markets reached and more patients connected to care at the right time.',
    quoteTag: 'Growth Strategy Consulting',
  },
];

const CORPORATE_SERVICES: Service[] = [
  {
    icon: 'analytics',
    title: 'Market & Territory Analysis',
    price: 'Custom pricing',
    cadence: '4–6 weeks',
    problem:
      "You don't know where referrals are coming from, where they should be coming from, or why the gap exists.",
    solution:
      "Get complete visibility into your market opportunity. Discover which accounts are underperforming, where competitors are winning, and which diagnosis categories represent untapped growth, so you can deploy resources where they'll actually move the needle.",
    included: [
      'Referral source analysis by market and diagnosis',
      'Competitor positioning and market share assessment',
      'Territory design: account assignment, routing optimization',
      'Top 10 growth opportunities with action plans',
    ],
    outcome:
      'You will know exactly where to focus resources for the highest return. Better targeting means teams spend time on accounts where eligible patients are actually being missed.',
    quoteTag: 'Market & Territory Analysis',
  },
  {
    icon: 'construct',
    title: 'System Implementation & Training',
    price: 'Custom pricing',
    cadence: '3–6 months',
    problem:
      "You have markets performing differently with no standard process. Wins aren't repeatable and you can't scale what's working.",
    solution:
      'Build one execution system that works in every market. Standardize how your team prospects, presents, handles objections, and follows up, so you can finally replicate what top performers do and stop relying on individual heroics.',
    included: [
      'Sales process design and documentation',
      'Team training rollout (virtual or on-site)',
      'Leadership coaching for local managers',
      'Performance tracking system and dashboards',
    ],
    outcome:
      'Every market runs the same playbook. You can see what is working and replicate it. Standardized execution across markets means no region leaves eligible patients underserved.',
    quoteTag: 'System Implementation & Training',
  },
  {
    icon: 'briefcase',
    title: 'Executive Consulting',
    price: 'Custom pricing',
    cadence: 'Ongoing retainer',
    problem:
      'You need strategic guidance for growth, M&A integration, or performance turnarounds, not generic consulting, but hospice-specific expertise.',
    solution:
      "Access senior-level strategic thinking without hiring a full-time executive. Get hospice-specific guidance on growth strategy, M&A integration, and performance turnarounds, from someone who's been in the field, knows what actually works, and can help you navigate complex decisions faster.",
    included: [
      'Monthly strategic planning sessions',
      'Market expansion and acquisition guidance',
      'Sales force effectiveness audits',
      'Crisis response and performance turnarounds',
    ],
    outcome:
      'Make better decisions faster with someone who knows hospice sales inside and out. Strategic clarity at the top translates to more families reached and served in every market.',
    quoteTag: 'Executive Consulting',
  },
];

const TECH_SERVICES: Service[] = [
  {
    icon: 'server',
    title: 'Custom CRM Development',
    price: 'Custom pricing',
    problem:
      "Generic CRMs are built for sales teams that sell products, not hospice liaisons managing relationships with physicians, facilities, and families. You're forcing a tool that doesn't fit your workflow, and it's costing you visibility.",
    solution:
      'Get a CRM built specifically for hospice sales operations. Track referral relationships, physician outreach cadences, facility account history, and census impact in one system designed around how hospice liaisons actually work.',
    included: [
      'Discovery and workflow mapping with your team',
      'Custom fields, pipelines, and dashboards for hospice-specific data',
      'Referral source tracking by account type and diagnosis',
      'Integration with existing EMR or reporting tools where possible',
      'Training and documentation for your team',
    ],
    outcome:
      'Your team stops working around their tools and starts working with them. Better data means better decisions, more consistent follow-through, and fewer referral opportunities that fall through the cracks.',
    quoteTag: 'Custom CRM Development',
  },
  {
    icon: 'phone-portrait',
    title: 'iOS App Development',
    price: 'Custom pricing',
    problem:
      'Your liaisons are in the field all day with no reliable way to log visits, update account status, or access patient eligibility information in real time. Field work happens on paper or memory and critical data gets lost.',
    solution:
      'Put a purpose-built iOS app in the hands of every field liaison. Log visits, update referral source notes, track follow-up commitments, and access territory intelligence from any location, all built around the specific workflows of your organization.',
    included: [
      'iOS native app built for iPhone and iPad',
      'Offline mode for areas with limited connectivity',
      'Real-time sync with your CRM or backend system',
      'Visit logging, account notes, and follow-up scheduling',
      'App Store submission and deployment support',
    ],
    outcome:
      'Your liaisons capture better data in the field, follow through on more commitments, and spend less time on administrative catch-up. The organization gets real-time visibility into field activity without adding reporting burden.',
    quoteTag: 'iOS App Development',
  },
  {
    icon: 'globe',
    title: 'Custom Website Development',
    price: 'Custom pricing',
    problem:
      "Your website looks like a template. It does not reflect your organization's culture, differentiate your care model, or give referral sources and families a clear reason to choose you over a competitor two miles away.",
    solution:
      'Build a website that works for your hospice organization specifically. One that speaks to your referral sources, communicates your care philosophy, and makes it easy for families in crisis to take the next step without confusion.',
    included: [
      'Discovery session to understand your market, brand, and referral source audience',
      "Custom design aligned with your organization's identity",
      'Referral source portal or intake flow (if needed)',
      'Mobile-optimized and fast-loading on all devices',
      'SEO foundation targeting your service areas and diagnosis categories',
    ],
    outcome:
      'A website that does actual work. Referral sources who visit understand what makes you different. Families in need find a clear path to care. Your digital presence stops being a liability and starts generating inbound interest.',
    quoteTag: 'Custom Website Development',
  },
];

// ---------- Component ----------
export default function ServicesScreen() {
  const router = useRouter();
  const [bookOpen, setBookOpen] = useState(false);
  const [bookPkg, setBookPkg] = useState<'coaching_30' | 'coaching_60'>('coaching_30');
  const [bookForm, setBookForm] = useState({ name: '', email: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const openBook = (pkgId: 'coaching_30' | 'coaching_60') => {
    setBookPkg(pkgId);
    setBookOpen(true);
  };

  const handleCheckout = async () => {
    if (!bookForm.name.trim() || !bookForm.email.trim()) {
      Alert.alert('Missing info', 'Please enter your name and email so Nick can confirm scheduling.');
      return;
    }
    setSubmitting(true);
    try {
      const origin =
        typeof window !== 'undefined' && window.location
          ? window.location.origin
          : (process.env.EXPO_PUBLIC_APP_ORIGIN || '');
      const { url } = await createCheckout({
        package_id: bookPkg,
        origin_url: origin,
        customer_name: bookForm.name,
        customer_email: bookForm.email,
        notes: bookForm.notes,
      });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = url;
      } else {
        const { Linking } = await import('react-native');
        Linking.openURL(url);
        setBookOpen(false);
      }
    } catch (e: any) {
      Alert.alert(
        'Checkout error',
        e?.response?.data?.detail || e.message || 'Could not start checkout. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requestQuote = (tag: string) => {
    router.push({ pathname: '/(tabs)/more', params: { interest: tag } } as any);
  };

  const requestBAA = () => {
    router.push({
      pathname: '/(tabs)/more',
      params: {
        interest: 'BAA Request — HIPAA Compliant Engagement',
        message: "We're a corporate hospice provider and need a Business Associate Agreement (BAA) before engaging. Please send the BAA and outline next steps.",
      },
    } as any);
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        <SectionLabel>Services & Pricing</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Built for every level of the organization</H1>
        <Body dim style={{ marginBottom: spacing.l }}>
          Whether you are an individual rep, a sales director, a multi-market operator, or a hospice provider who needs purpose-built technology, there is an engagement built for your situation.
        </Body>

        {/* ===== Individual Sales Reps ===== */}
        <SectionHeading kicker="For Individual Sales Reps" title="Break through what is stalling you right now." />
        {INDIVIDUAL_SERVICES.map((s) => (
          <ServiceCard
            key={s.title}
            service={s}
            onBook={openBook}
            onQuote={requestQuote}
            testIdPrefix="svc-individual"
          />
        ))}

        {/* ===== Sales Leadership ===== */}
        <SectionHeading kicker="For Sales Leadership" title="Build teams that execute consistently and scale what works." />
        {LEADERSHIP_SERVICES.map((s) => (
          <ServiceCard
            key={s.title}
            service={s}
            onBook={openBook}
            onQuote={requestQuote}
            testIdPrefix="svc-leadership"
          />
        ))}

        {/* ===== Corporate Hospice Providers ===== */}
        <SectionHeading
          kicker="For Corporate Hospice Providers"
          title="Scale execution and standardize what works across every market."
        />

        {/* HIPAA / BAA banner */}
        <Card
          style={{
            marginBottom: spacing.l,
            borderColor: 'rgba(34,197,94,0.4)',
            backgroundColor: 'rgba(34,197,94,0.06)',
          }}
        >
          <View style={{ flexDirection: 'row', gap: spacing.m, alignItems: 'flex-start' }}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(34,197,94,0.18)' }]}>
              <Ionicons name="shield-checkmark" size={22} color="#22c55e" />
            </View>
            <View style={{ flex: 1 }}>
              <H3 style={{ marginBottom: 4 }}>HIPAA Compliant Engagement</H3>
              <Body dim style={{ marginBottom: spacing.s }}>
                No PHI stored or processed. BAA available for corporate accounts.
              </Body>
              <View style={{ flexDirection: 'row', gap: spacing.s, flexWrap: 'wrap' }}>
                <GhostButton
                  testID="svc-view-compliance"
                  label="View compliance details"
                  onPress={() => router.push('/compliance')}
                />
                <PrimaryButton
                  testID="svc-request-baa"
                  label="Request a BAA"
                  onPress={requestBAA}
                  icon={<Ionicons name="document-text" size={14} color="#fff" />}
                />
              </View>
            </View>
          </View>
        </Card>

        {CORPORATE_SERVICES.map((s) => (
          <ServiceCard
            key={s.title}
            service={s}
            onBook={openBook}
            onQuote={requestQuote}
            testIdPrefix="svc-corporate"
          />
        ))}

        {/* ===== Technology Solutions ===== */}
        <SectionHeading
          kicker="Technology Solutions"
          title="Custom-built tools designed specifically for hospice providers."
        />
        <Body dim style={{ marginBottom: spacing.l }}>
          Off-the-shelf software is built for generic sales teams. Hospice operations have specific workflows, compliance requirements, and relationship dynamics that generic tools don&apos;t account for. These engagements deliver purpose-built technology that fits your organization, not the other way around.
        </Body>
        {TECH_SERVICES.map((s) => (
          <ServiceCard
            key={s.title}
            service={s}
            onBook={openBook}
            onQuote={requestQuote}
            testIdPrefix="svc-tech"
          />
        ))}

        <PrimaryButton
          testID="svc-get-in-touch"
          label="Get in Touch"
          onPress={() => router.push('/(tabs)/more')}
          icon={<Ionicons name="arrow-forward" size={14} color="#fff" />}
        />
      </ScrollView>

      {/* ===== Booking Modal ===== */}
      <Modal visible={bookOpen} transparent animationType="fade" onRequestClose={() => setBookOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.m }}>
              <View style={[styles.iconWrap, { marginRight: spacing.m }]}>
                <Ionicons name="videocam" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <H3>Book a Coaching Session</H3>
                <Small dim>
                  {bookPkg === 'coaching_30' ? '30 minutes · $40 USD' : '60 minutes · $70 USD'}
                </Small>
              </View>
              <Pressable testID="book-close" onPress={() => setBookOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={palette.textMuted} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.s, marginBottom: spacing.m }}>
              <PackagePill
                active={bookPkg === 'coaching_30'}
                label="30 min · $40"
                onPress={() => setBookPkg('coaching_30')}
                testID="book-pkg-30"
              />
              <PackagePill
                active={bookPkg === 'coaching_60'}
                label="60 min · $70"
                onPress={() => setBookPkg('coaching_60')}
                testID="book-pkg-60"
              />
            </View>

            <ModalField
              testID="book-name"
              label="Your name"
              value={bookForm.name}
              onChangeText={(v) => setBookForm((s) => ({ ...s, name: v }))}
              placeholder="Full name"
            />
            <ModalField
              testID="book-email"
              label="Email"
              value={bookForm.email}
              onChangeText={(v) => setBookForm((s) => ({ ...s, email: v }))}
              placeholder="you@example.com"
              keyboardType="email-address"
            />
            <ModalField
              testID="book-notes"
              label="What do you want to work on? (optional)"
              value={bookForm.notes}
              onChangeText={(v) => setBookForm((s) => ({ ...s, notes: v }))}
              placeholder="The exact challenge, objection, or account that's stalling"
              multiline
            />

            <PrimaryButton
              testID="book-submit"
              label={submitting ? 'Redirecting to Stripe…' : `Pay & Book — $${bookPkg === 'coaching_30' ? 40 : 70}`}
              onPress={handleCheckout}
              disabled={submitting}
              icon={
                submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="card" size={14} color="#fff" />
                )
              }
            />
            <Small dim style={{ textAlign: 'center', marginTop: spacing.s }}>
              Secure payment via Stripe. You will receive a receipt by email.
            </Small>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------- Sub-components ----------
function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <View style={{ marginTop: spacing.l, marginBottom: spacing.m }}>
      <Small style={{ color: palette.primary, fontWeight: '800', letterSpacing: 1, marginBottom: 4 }}>
        {kicker.toUpperCase()}
      </Small>
      <H2>{title}</H2>
    </View>
  );
}

function ServiceCard({
  service,
  onBook,
  onQuote,
  testIdPrefix,
}: {
  service: Service;
  onBook: (id: 'coaching_30' | 'coaching_60') => void;
  onQuote: (tag: string) => void;
  testIdPrefix: string;
}) {
  const tid = `${testIdPrefix}-${service.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <Card style={{ marginBottom: spacing.l }} testID={tid}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m, marginBottom: spacing.s }}>
        <LinearGradient colors={[palette.primary, palette.primaryDark]} style={styles.iconWrap}>
          <Ionicons name={service.icon} size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <H3>{service.title}</H3>
          <Small style={{ color: '#22c55e', fontWeight: '700' }}>
            {service.price}
            {service.cadence ? `  ·  ${service.cadence}` : ''}
          </Small>
        </View>
      </View>

      <DetailBlock label="The Problem" text={service.problem} />
      <DetailBlock label="The Solution" text={service.solution} />

      <Small style={styles.sectionLabel}>What&apos;s Included</Small>
      <View style={{ marginTop: 4, marginBottom: spacing.s }}>
        {service.included.map((b, i) => (
          <View key={i} style={styles.bullet}>
            <Ionicons name="checkmark" size={14} color={palette.primary} />
            <Body style={{ flex: 1, fontSize: 14 }}>{b}</Body>
          </View>
        ))}
      </View>

      <DetailBlock label="Outcome" text={service.outcome} />

      <View style={{ flexDirection: 'row', gap: spacing.s, marginTop: spacing.m, flexWrap: 'wrap' }}>
        {service.packages?.map((p) => (
          <PrimaryButton
            key={p.id}
            testID={`${tid}-buy-${p.id}`}
            label={`Book ${p.label}`}
            onPress={() => onBook(p.id)}
            icon={<Ionicons name="card" size={14} color="#fff" />}
          />
        ))}
        {!service.packages && (
          <PrimaryButton
            testID={`${tid}-quote`}
            label="Request a Quote"
            onPress={() => onQuote(service.quoteTag)}
            icon={<Ionicons name="arrow-forward" size={14} color="#fff" />}
          />
        )}
      </View>
    </Card>
  );
}

function DetailBlock({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ marginBottom: spacing.s }}>
      <Small style={styles.sectionLabel}>{label}</Small>
      <Body style={{ marginTop: 4, fontSize: 14 }}>{text}</Body>
    </View>
  );
}

function PackagePill({
  active,
  label,
  onPress,
  testID,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pkgPill,
        active && styles.pkgPillActive,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Small style={{ color: active ? '#fff' : palette.text, fontWeight: '700' }}>{label}</Small>
    </Pressable>
  );
}

function ModalField({
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
          multiline && { minHeight: 90, textAlignVertical: 'top' as const, paddingTop: 12 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bullet: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 },
  sectionLabel: {
    color: palette.primary,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.l,
  },
  modalCard: {
    backgroundColor: palette.bgElev1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    padding: spacing.l,
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
  pkgPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.cardBorderStrong,
    backgroundColor: palette.bgElev2,
  },
  pkgPillActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
});
