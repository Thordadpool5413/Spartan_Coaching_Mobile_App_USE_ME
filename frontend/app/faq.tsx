import React, { useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../theme';
import { Card, H1, H3, Body, Small, SectionLabel } from '../components/UI';

const FAQS = [
  { q: 'Is this for individuals or for entire teams?', a: 'Both. We work with individual hospice liaisons, sales managers, directors, and corporate growth teams. Engagements are sized to fit.' },
  { q: 'How quickly do reps see results?', a: 'Habits show up first. Within two to three weeks reps usually have a clearer week, better follow-up, and stronger discovery questions. Pipeline movement follows. We measure behaviors before outcomes.' },
  { q: 'Do you train aggressive sales tactics?', a: 'No. We coach ethical, education-based relationship building. We do not train inducements, manipulation, or misleading messaging. If it would not pass a compliance review, we do not teach it.' },
  { q: 'Do you guarantee specific admission numbers?', a: 'No. We provide frameworks, coaching, and accountability. Results depend on consistent execution by committed teams. We do not promise specific outcomes.' },
  { q: 'How does the weekly coaching cadence work?', a: 'Most engagements include a weekly 60-minute session with structured pre-work, a debrief on the prior week, and a clear plan for the next. Sessions are virtual unless ridealongs are scheduled.' },
  { q: 'What about HIPAA and patient identifiers?', a: 'No protected health information ever enters Spartan tools. Tools are for planning, messaging, and territory work. Reps learn the boundary on day one.' },
  { q: 'Do you work with non-Medicare hospices?', a: 'Most coaching content centers on the Medicare Hospice Benefit because it is the dominant US payor. State Medicaid variations and commercial coverage are addressed where relevant.' },
  { q: 'How is this different from generic sales training?', a: 'Generic sales training does not understand hospice. We do. Our frameworks honor clinical workflow, Medicare rules, and the moral weight of end-of-life conversations. Generic training gets you a sales seminar. We get you a system.' },
];

export default function FAQScreen() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }}>
        <SectionLabel>FAQ</SectionLabel>
        <H1 style={{ marginBottom: spacing.s }}>Frequently Asked Questions</H1>
        <Body dim style={{ marginBottom: spacing.xl }}>
          Practical answers. If you do not see your question, send it via the Contact form.
        </Body>

        {FAQS.map((f, i) => (
          <Pressable
            key={i}
            testID={`faq-${i}`}
            onPress={() => setOpen((cur) => (cur === i ? null : i))}
            style={{ marginBottom: spacing.m }}
          >
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <H3 style={{ flex: 1, fontSize: 16 }}>{f.q}</H3>
                <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textMuted} />
              </View>
              {open === i && (
                <Body dim style={{ marginTop: spacing.s }}>{f.a}</Body>
              )}
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
