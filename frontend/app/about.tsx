import React from 'react';
import { ScrollView, View, Image, StyleSheet, Pressable } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, spacing } from '../theme';
import { Card, H1, H2, H3, Body, Small, SectionLabel } from '../components/UI';

const NICK = require('../assets/images/nick-photo.jpg');

const VALUES = [
  { title: 'Practical Over Theoretical', desc: 'Coaching happens in the work, not in a classroom.', icon: 'book' as const },
  { title: 'Consistency Over Intensity', desc: 'Simple plans repeated well beat heroic one-time efforts.', icon: 'sync' as const },
  { title: 'Patient-First Outcomes', desc: 'Every strategy prioritizes getting eligible patients into care earlier.', icon: 'heart' as const },
  { title: 'Ethical Relationship Building', desc: 'Education-based outreach that respects clinical partners.', icon: 'people-outline' as const },
];

export default function AboutScreen() {
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={{ padding: spacing.l }}>
          <SectionLabel>About</SectionLabel>
          <H1>Why Spartan Coaching Exists</H1>
          <Body dim style={{ marginTop: spacing.s, fontSize: 17 }}>
            Hospice is not a mystery. It is a promise.
          </Body>
        </View>

        <View style={{ paddingHorizontal: spacing.l }}>
          <Card style={{ marginBottom: spacing.l }}>
            <Body style={{ marginBottom: spacing.m }}>
              The promise is simple. When a person is eligible, they should receive expert, compassionate care without delay, and their family should feel supported at every step. That promise breaks when sales teams are left with vague goals, light coaching, and a calendar full of activity that does not move referrals.
            </Body>
            <Body style={{ fontWeight: '700' }}>
              Spartan Coaching exists to close the gap between good intentions and consistent execution so more eligible patients receive care earlier in their journey.
            </Body>
          </Card>

          {/* The Stakes */}
          <SectionLabel>The Stakes Are Real</SectionLabel>
          {[
            { title: 'For Teams', body: 'When teams communicate clearly with referral partners and remove friction from the pathway, length of stay stabilizes, hospital readmissions drop, and families feel seen.', icon: 'locate' as const },
            { title: 'For Reps', body: 'When reps carry a clean plan for their top accounts, follow up is faster, objections become opportunities to educate, and referrals move from interest to signed order without getting lost.', icon: 'people' as const },
            { title: 'For Organizations', body: 'When the corporate office can see the same standards across markets, wins are repeatable and growth is not guesswork.', icon: 'trending-up' as const },
          ].map((s, i) => (
            <Card key={i} style={{ marginBottom: spacing.m }}>
              <LinearGradient
                colors={[palette.primary, palette.primaryDark]}
                style={styles.iconCircle}
              >
                <Ionicons name={s.icon} size={18} color="#fff" />
              </LinearGradient>
              <H3 style={{ marginTop: spacing.m, marginBottom: 6 }}>{s.title}</H3>
              <Body dim>{s.body}</Body>
            </Card>
          ))}

          {/* Founder */}
          <View style={{ marginTop: spacing.xxl }}>
            <SectionLabel>The Founder</SectionLabel>
            <Card>
              <View style={{ alignItems: 'center', marginBottom: spacing.l }}>
                <Image source={NICK} style={styles.nickPhoto} />
                <H2 style={{ marginTop: spacing.m }}>Nick Lynch</H2>
                <Small dim>Founder</Small>
              </View>
              <Body style={{ marginBottom: spacing.m }}>
                Nick brings two things into hospice coaching that most people keep separate: what liaisons see in the field every day and what leaders need to see to coach performance without guessing. He has led teams, worked in clinics, and spent real time on ride alongs, seeing firsthand where good plans break down and what actually holds up.
              </Body>
              <Body style={{ marginBottom: spacing.m }}>
                Nick helps teams decide the next right move and then follow through. He keeps the work anchored to the field and aligned with clinical workflow, so it stays usable when the week gets busy.
              </Body>
              <Body dim>
                When Nick steps away, leaders are not just looking at numbers. They understand the people behind them. They know what each rep is strong at, where they hesitate, what they avoid, and what they need next. They can coach the person, not just the pipeline.
              </Body>
            </Card>
          </View>

          {/* Values */}
          <View style={{ marginTop: spacing.xxl }}>
            <SectionLabel>Values & Philosophy</SectionLabel>
            {VALUES.map((v, i) => (
              <Card key={i} style={{ marginBottom: spacing.m, flexDirection: 'row', gap: spacing.m, alignItems: 'flex-start' }}>
                <LinearGradient colors={[palette.primary, palette.primaryDark]} style={styles.smallIcon}>
                  <Ionicons name={typeof v.icon === 'string' ? (v.icon as any) : 'star'} size={16} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <H3 style={{ fontSize: 16, marginBottom: 4 }}>{v.title}</H3>
                  <Small dim>{v.desc}</Small>
                </View>
              </Card>
            ))}
          </View>

          {/* Quote */}
          <Card style={{ marginTop: spacing.l, backgroundColor: palette.bgElev2 }}>
            <H3 style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 17, lineHeight: 26 }}>
              &quot;Ethics without structure does not scale. Structure without heart does not last. We teach both.&quot;
            </H3>
          </Card>

          {/* LinkedIn */}
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync('https://www.linkedin.com/in/nicholas-lynch-coaching')}
            style={({ pressed }) => [styles.linkedinBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="logo-linkedin" size={20} color="#0A66C2" />
            <Body style={{ fontWeight: '700' }}>Connect on LinkedIn</Body>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  smallIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  nickPhoto: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 3, borderColor: palette.primary + '50',
  },
  linkedinBtn: {
    flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, marginTop: spacing.l, borderRadius: radius.md,
    backgroundColor: palette.bgElev1, borderWidth: 1, borderColor: palette.cardBorder,
  },
});
