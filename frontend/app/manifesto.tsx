import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, spacing } from '../theme';
import { Card, H1, H2, H3, Body, Small, SectionLabel } from '../components/UI';

const SECTIONS = [
  {
    title: 'I. We exist to close the gap.',
    body: 'Hundreds of thousands of Americans die each year without hospice care who would have qualified for it. The average length of stay is around eighteen days. The Medicare benefit allows up to six months. That gap does not exist because of bad clinical decisions. It exists because the right conversations did not happen.',
  },
  {
    title: 'II. Preparation is a moral act.',
    body: "You do not show up unprepared to the most important conversations in people's lives. A physician who says \"not yet\" deserves a rep who knows how to respond. A family who is scared deserves someone who can explain what hospice actually is. Preparation is how we honor the gravity of the work.",
  },
  {
    title: 'III. Discipline beats intensity.',
    body: 'A great quarter is the byproduct of a consistent Tuesday. We teach systems that work on the worst day of the week, not just on the day of the kickoff meeting. Repetition done with intent is the engine. Heroics will not save a flat pipeline.',
  },
  {
    title: 'IV. Empathy is not soft.',
    body: 'Empathy is the discipline of staying curious when it is easier to be defensive. It is asking better questions than the rep before you. It is letting the discharge planner finish her sentence. It is being slow when the moment calls for slow.',
  },
  {
    title: 'V. Strategy beats activity.',
    body: 'Visits are not a metric. Conversations that move referrals are. We trade busy for intentional. We trade a calendar full of "check-ins" for a week that has a thesis. We measure what we want repeated.',
  },
  {
    title: 'VI. Ethics is not optional.',
    body: 'We do not train inducements. We do not promise admissions. We do not teach manipulation. We teach education-based relationship building that respects patient choice and clinical judgment. If we cannot do it ethically, we do not do it.',
  },
  {
    title: 'VII. The rep is the bridge.',
    body: 'Between an eligible patient and a care team. Between a scared family and a plan they can live with. Between a clinical hunch and a referral that arrives in time. We train the bridge to stand under load.',
  },
];

export default function ManifestoScreen() {
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.l, paddingBottom: 80 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SectionLabel>The Ethos</SectionLabel>
        <H1>The Spartan Ethos</H1>
        <Body dim style={{ marginTop: spacing.s, marginBottom: spacing.xl, fontSize: 17 }}>
          Seven principles that anchor everything we coach.
        </Body>

        {SECTIONS.map((s, i) => (
          <Card key={i} style={{ marginBottom: spacing.m }}>
            <H3 style={{ marginBottom: 8, color: palette.primary }}>{s.title}</H3>
            <Body style={{ lineHeight: 24 }}>{s.body}</Body>
          </Card>
        ))}

        <Card style={{ marginTop: spacing.l, backgroundColor: palette.bgElev2 }}>
          <H2 style={{ textAlign: 'center', fontSize: 22, marginBottom: spacing.s }}>
            Built in the field.{'\n'}Proven in practice.
          </H2>
          <Body dim style={{ textAlign: 'center' }}>
            Every framework has been tested in real hospice markets. This is not theory. It is a traceable system where preparation maps to Discovery, practice maps to Connecting, measurement maps to Guiding, and finishing strong maps to Commitment. The ethics hold it all together.
          </Body>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
