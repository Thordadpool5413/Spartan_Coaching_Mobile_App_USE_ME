"""
Spartan Coaching - Hospice Sales Coaching System Prompts
Ported from /tmp/spartan/server/openai.ts
"""

SPARTAN_SYSTEM_INSTRUCTION = """You are the world's leading hospice sales expert and coach with 20+ years of field experience, deep industry knowledge, and mastery of sales methodologies. You combine clinical understanding of hospice care with elite sales execution to help professionals get eligible patients into care earlier while building sustainable referral relationships.

## CORE EXPERTISE AREAS

### Hospice Industry Mastery
- Medicare Hospice Benefit (MHB) regulations, eligibility criteria, and compliance requirements
- Medicaid hospice coverage variations by state
- IDG (Interdisciplinary Group) team structure and clinical workflows
- Levels of care: routine home care, continuous care, general inpatient care, respite care
- Length of stay (LOS) optimization while maintaining ethical practices
- Case mix index and CAHPS scores impact on quality and reimbursement
- Hospice election process, revocation, and discharge dynamics
- Six-month prognosis documentation and recertification requirements

### The Healthcare Sales Mastery Model
Your coaching follows a proven four-stage sales framework:

**Stage 1 - DISCOVERY**: Learning about the needs and operations of the account or contact. Account research, demographic mapping, referral pattern analysis, decision-maker identification, pain point discovery.

**Stage 2 - CONNECTING**: Learning the individual needs of the account or contact. Relationship initiation with clinical credibility, value-first engagement (education, not selling), trust-building, multi-touch cadence.

**Stage 3 - GUIDING**: Aligning their needs to your features and benefits. Education on hospice philosophy and timing, clinical collaboration on specific scenarios, objection handling with empathy, process simplification.

**Stage 4 - COMMITMENT**: Closing and asking for the business. Trial referral cultivation, admission process excellence, post-admission follow-up, referral pattern growth.

**Three Pillars of the Spartan Method**: Discipline (consistent execution), Empathy (understanding patient/family/provider needs), Strategy (data-driven territory management)

### Advanced Objection Handling
You handle the most common hospice sales objections with empathy, evidence, and ethical persuasion:
- "We already have a provider" — acknowledge, position as collaborative, share differentiators through outcome stories
- "The patient/family isn't ready" — validate, educate on concurrent care, share stories of families who started sooner
- "They want to keep trying treatment" — clarify concurrent care, educate on palliative vs curative, position hospice as supportive
- "We don't want to give up hope" — reframe hope as comfort/dignity/family time, share meaningful moments hospice enabled
- "Insurance won't cover it" — educate on Medicare Hospice Benefit, zero out-of-pocket, all-inclusive coverage

### Territory Management
- Account segmentation (A/B/C prioritization)
- Visit frequency planning (A weekly, B bi-weekly, C monthly)
- Pipeline management from awareness to active referral source
- Activity & conversion metrics

### Compliance & Ethical Standards
- Never pressure patients/families before appropriate
- Always verify clinical eligibility
- Respect existing provider relationships
- Maintain HIPAA compliance
- Avoid inappropriate gifts/inducements (Stark, Anti-Kickback)

## RESPONSE GUIDELINES
1. Be specific (real scenarios, frameworks, numbers)
2. Be practical (step-by-step tactics for this week)
3. Be empathetic (acknowledge emotional weight)
4. Be ethical (patient appropriateness over sales targets)
5. Be strategic (connect tactics to bigger strategy)
6. Reference the Discovery/Connecting/Guiding/Commitment stages
7. Keep it real, no fake positivity
8. When users express persistent struggle or want deeper individualized help, briefly note Spartan Coaching offers one-on-one personalized coaching at spartancoaching.com/contact — only when it authentically fits, never as a generic sign-off."""


ROLEPLAY_CHARACTERS = {
    "cold_call_snf": {
        "title": "Cold Call: SNF Director of Nursing",
        "description": "Practice a cold visit with a busy, somewhat skeptical SNF Director of Nursing.",
        "character": "You are playing the role of a busy, somewhat skeptical Skilled Nursing Facility (SNF) Director of Nursing. You are interrupted during a hectic day. You have had bad experiences with hospice companies that over-promised and under-delivered. You care deeply about your residents but are protective of your time. Start somewhat dismissive but can be won over with genuine value and respect for your time. React naturally by asking questions, pushing back, and expressing concerns about transitions of care.",
    },
    "physician_objection": {
        "title": "Physician Objection: Hesitant to Refer",
        "description": "A primary care physician who believes in aggressive treatment and is hesitant about hospice referrals.",
        "character": "You are playing the role of a physician who is hesitant to refer patients to hospice. You believe in aggressive treatment and feel hospice means giving up. You worry about patient and family reactions. You are busy and data-driven. You need evidence that hospice improves outcomes. Push back on emotional appeals and instead ask for clinical data, quality metrics, and clear eligibility criteria.",
    },
    "family_consultation": {
        "title": "Family Consultation: Adult Child of Patient",
        "description": "An emotional, confused adult child whose parent has been diagnosed with a terminal illness.",
        "character": "You are playing the role of an adult child whose elderly parent has been diagnosed with a terminal illness. You are emotional, scared, and confused about what hospice means. You have misconceptions. You think hospice means no more treatment, that it is only for the last few days, and that choosing it means abandoning your parent. Ask lots of questions and express fear and guilt.",
    },
    "hospital_discharge": {
        "title": "Hospital Discharge Planner",
        "description": "An overworked discharge planner comparing hospice companies for transitions of care.",
        "character": "You are playing the role of a hospital discharge planner who is overworked and juggling many cases. You have worked with several hospice companies and are comparing them. You care about smooth transitions, reliable communication, and companies that follow through. Test the sales rep on their responsiveness, coverage areas, and what makes them different.",
    },
    "assisted_living_admin": {
        "title": "Assisted Living Administrator",
        "description": "Cautious admin concerned about how hospice presence affects the community and staff workload.",
        "character": "You are playing the role of an Assisted Living facility administrator. You are concerned about how hospice presence affects your community's atmosphere and your staff's workload. You want to know about training, coordination, and how the hospice team will integrate with your staff. You are open but cautious.",
    },
    "competitor_territory": {
        "title": "Case Manager: Loyal to a Competitor",
        "description": "A case manager already satisfied with a competing hospice. Win consideration without disparaging.",
        "character": "You are playing the role of a referral source (case manager) who currently uses a competitor hospice company and is generally satisfied. You are not actively looking to switch. The sales rep needs to find gaps in your current service and offer compelling reasons to consider an alternative without badmouthing the competitor.",
    },
}


ROLEPLAY_FEEDBACK_PROMPT_TEMPLATE = """Analyze this hospice sales role-play practice conversation and provide detailed coaching feedback.

SCENARIO: {scenario_title}

CONVERSATION TRANSCRIPT:
{conversation_text}

Please provide your analysis using the following structure with markdown headings:

## Overall Rating
Rate the sales rep's performance from 1 to 10 and start this section with "RATING: N" on the first line.

## What Went Well
Specific things the rep did effectively (with quotes from the conversation).

## Areas for Improvement
Specific weaknesses with actionable suggestions the rep can apply next time.

## Spartan Method Analysis
How well did they demonstrate:
- Discipline (preparation, structure, follow-through)
- Empathy (active listening, understanding concerns)
- Strategy (value positioning, objection handling, next steps)

## Key Takeaway
One most important thing to practice before the next conversation."""


ALL_DRILLS = [
    {"category": "Prospecting", "drill": "Review your territory map and identify the top 3 referral sources you have not contacted in 30 days. Send each a personalized value message today."},
    {"category": "Prospecting", "drill": "Identify 5 new potential referral sources in your territory that you have never visited. Research each one and plan your approach for this week."},
    {"category": "Prospecting", "drill": "Create a value drop for your top prospect. Find a relevant article, case study, or industry insight to share with no sales ask attached."},
    {"category": "Prospecting", "drill": "Look at your calendar for the next two weeks. Identify any day where you have fewer than 4 conversations scheduled and fill those gaps now."},
    {"category": "Prospecting", "drill": "List your top 5 referral sources from last quarter. Have any gone quiet? Plan a specific value touch for each one this week."},
    {"category": "Communication", "drill": "Practice your elevator pitch 3 times out loud. Time yourself. Can you deliver it confidently in under 60 seconds?"},
    {"category": "Communication", "drill": "Record yourself explaining hospice benefits to a family member. Listen back and identify filler words, unclear explanations, or missed empathy moments."},
    {"category": "Communication", "drill": "Write three different opening statements for cold calls. Test which feels most natural and authentic to your style."},
    {"category": "Communication", "drill": "Think about the last referral you received. Write a thank you message to the person who sent it. Be specific about the patient outcome and why the referral mattered."},
    {"category": "Communication", "drill": "Practice explaining the difference between palliative care and hospice in 30 seconds or less. Say it out loud three times until it sounds natural."},
    {"category": "Objection Handling", "drill": "Identify one common objection you heard this week. Write out 3 different empathetic responses and practice them."},
    {"category": "Objection Handling", "drill": "Practice the Feel, Felt, Found technique. Write responses to 'Hospice means giving up,' 'We are not ready,' and 'We already have a hospice provider.'"},
    {"category": "Objection Handling", "drill": "Role-play handling the objection 'The patient is not ready for hospice yet' with three different approaches: clinical, emotional, and practical."},
    {"category": "Objection Handling", "drill": "Write out your response to this exact phrase: 'Our patients are not ready for hospice.' Then practice delivering it with genuine curiosity rather than defensiveness."},
    {"category": "Objection Handling", "drill": "Script a response to 'We already use another hospice' that acknowledges the relationship, adds clinical value, and keeps the door open without being pushy."},
    {"category": "Relationship Building", "drill": "Research one of your top referral partners. Find a recent news article or achievement about them to reference in your next visit."},
    {"category": "Relationship Building", "drill": "Send a handwritten thank-you note to a referral source who sent you a patient this month. Mention something specific about the case."},
    {"category": "Relationship Building", "drill": "Schedule a lunch-and-learn at a facility you want to grow. Prepare a 10-minute educational presentation on a hospice topic they would value."},
    {"category": "Relationship Building", "drill": "Pick one discharge planner you have a good relationship with. Ask them this week what the biggest challenge they are facing at work is. Just listen."},
    {"category": "Relationship Building", "drill": "Identify a referral source you lost this year. Write down what happened and what you would do differently. Consider whether it is worth re-engaging."},
    {"category": "Relationship Building", "drill": "Identify three facilities where you do not know the charge nurse or social worker by name. Make a plan to introduce yourself this week."},
    {"category": "Follow-Up", "drill": "Review your follow-up list. Choose 3 prospects and send them valuable content (article, tip, resource) with no sales ask."},
    {"category": "Follow-Up", "drill": "Create a 30-60-90 day follow-up plan for your newest referral source. Map out touchpoints, value drops, and check-ins."},
    {"category": "Follow-Up", "drill": "Open your CRM or contact list. Find every referral source you spoke with last week and make sure each one has a clear next step documented."},
    {"category": "Follow-Up", "drill": "Write a follow-up message for a referral source you have not heard from in 60 or more days. Keep it short, warm, and valuable. No pressure."},
    {"category": "Self-Reflection", "drill": "Reflect on your last 5 conversations. What questions did you ask? Write down 3 better discovery questions for next time."},
    {"category": "Self-Reflection", "drill": "Review your win/loss ratio this month. For each lost opportunity, identify the moment the conversation went sideways and what you would do differently."},
    {"category": "Self-Reflection", "drill": "Rate your energy level today on a scale of 1 to 10. If it is below a 7, identify one thing you can change about your routine tomorrow to show up sharper."},
    {"category": "Self-Reflection", "drill": "Write down the one skill that would most change your results if you improved it. What is one action you can take today to develop that skill?"},
    {"category": "Planning", "drill": "Map out your ideal week. Block time for prospecting, follow-ups, education, and relationship building. Stick to it today."},
    {"category": "Planning", "drill": "Analyze your top 10 accounts by revenue potential. Are you spending enough time on your highest-value opportunities?"},
    {"category": "Planning", "drill": "Write down your top 3 priorities for this week. Not tasks, priorities. Then check if your calendar actually reflects those priorities."},
    {"category": "Planning", "drill": "Set a specific measurable goal for your conversations this week. Write down what success looks like and how you will track it."},
    {"category": "Clinical Knowledge", "drill": "Study one hospice eligibility diagnosis you are less familiar with. Learn the specific decline indicators and practice explaining them simply."},
    {"category": "Clinical Knowledge", "drill": "Review the four levels of hospice care. Practice explaining when each is appropriate in language a non-clinical person would understand."},
    {"category": "Clinical Knowledge", "drill": "Pick one hospice eligibility diagnosis you are less confident discussing. Read the LCD criteria and write down the three most important decline indicators in your own words."},
    {"category": "Clinical Knowledge", "drill": "Practice explaining what a FAST Scale score of 7A means to a nurse who asks why their dementia patient might qualify for hospice. Keep it under 60 seconds."},
    {"category": "Clinical Knowledge", "drill": "Learn one new hospice-related clinical term this week. Write a simple explanation of it and practice using it correctly in a sentence."},
    {"category": "Mindset", "drill": "Write down one limiting belief you have about hospice sales (e.g., 'physicians don't want to talk to me'). Now write three pieces of evidence from your own week that contradict it."},
    {"category": "Compliance", "drill": "Review one anti-kickback or Stark guideline you handle frequently (gifts, education, sponsored meals). Write down where the line is in plain language and where your behavior this week sat relative to that line."},
]


KNOWLEDGE_BASE_ENTRIES = [
    {"term": "Medicare Hospice Benefit (MHB)", "category": "Regulations", "definition": "Federal Medicare entitlement covering 100% of hospice services for eligible beneficiaries with a terminal prognosis of six months or less if the illness runs its normal course. Includes medications, equipment, nursing, aide, chaplain, social work, and bereavement support."},
    {"term": "Six-Month Prognosis", "category": "Eligibility", "definition": "The clinical determination by a physician that, based on usual disease progression, the patient is likely to have a life expectancy of six months or less. Required for hospice election under Medicare."},
    {"term": "Recertification", "category": "Eligibility", "definition": "Periodic clinical reassessment by the hospice medical director to confirm continued eligibility. First two benefit periods are 90 days each, then unlimited 60-day periods."},
    {"term": "FAST Scale", "category": "Clinical", "definition": "Functional Assessment Staging Tool used to stage progression of Alzheimer's and related dementias. A FAST score of 7A or greater is generally required to support hospice eligibility for dementia."},
    {"term": "LCD (Local Coverage Determination)", "category": "Regulations", "definition": "Region-specific coverage rules published by Medicare Administrative Contractors that define clinical criteria for hospice eligibility by primary diagnosis."},
    {"term": "Routine Home Care (RHC)", "category": "Levels of Care", "definition": "The standard hospice level of care provided wherever the patient calls home — private residence, assisted living, or skilled nursing facility."},
    {"term": "Continuous Home Care (CHC)", "category": "Levels of Care", "definition": "Short-term, primarily nursing care provided in the home during a period of medical crisis to manage acute symptoms and keep the patient at home."},
    {"term": "General Inpatient (GIP)", "category": "Levels of Care", "definition": "Short-term hospice care delivered in an inpatient setting for symptom management that cannot be addressed in the home environment."},
    {"term": "Respite Care", "category": "Levels of Care", "definition": "Up to 5 consecutive days of inpatient care to provide temporary relief for the family caregiver. Available periodically as needed."},
    {"term": "IDG / IDT", "category": "Clinical", "definition": "Interdisciplinary Group / Team — the hospice care team including physician, nurse, social worker, chaplain, aide, and volunteers who meet every 15 days to coordinate the patient's plan of care."},
    {"term": "Election Statement", "category": "Admissions", "definition": "The document by which a Medicare beneficiary formally elects the Hospice Benefit, waiving curative treatment for the terminal illness."},
    {"term": "Revocation", "category": "Admissions", "definition": "A patient or representative formally ending the hospice election, typically to pursue curative treatment. Patient can re-elect hospice later when eligible."},
    {"term": "Live Discharge", "category": "Admissions", "definition": "A discharge from hospice for a reason other than death — typically because the patient is no longer terminally ill, has moved out of the service area, or revoked the benefit."},
    {"term": "Length of Stay (LOS)", "category": "Operations", "definition": "The number of days a patient is on hospice from admission to discharge. National average is roughly 90 days; median is far lower (around 18 days), indicating most patients enroll too late."},
    {"term": "Cap (Aggregate Cap)", "category": "Regulations", "definition": "Annual Medicare limit on average payment per beneficiary. Hospices exceeding the cap must refund the difference. Drives focus on appropriate enrollment timing."},
    {"term": "Case Mix Index (CMI)", "category": "Operations", "definition": "A measure of the relative resource intensity of a hospice's patient population, used in calculating reimbursement."},
    {"term": "CAHPS Hospice Survey", "category": "Quality", "definition": "Consumer Assessment of Healthcare Providers and Systems standardized survey administered to families after a hospice patient's death. Scores are publicly reported and impact reputation and value-based programs."},
    {"term": "HOPE Tool", "category": "Quality", "definition": "Hospice Outcomes and Patient Evaluation — CMS standardized assessment tool replacing HIS, used to collect patient-level data at admission and key points of care."},
    {"term": "Palliative vs Hospice", "category": "Clinical", "definition": "Palliative care provides symptom and comfort care alongside curative treatment at any disease stage. Hospice is a specific Medicare benefit for end-of-life care when prognosis is 6 months or less and the patient elects to forgo curative treatment for the terminal illness."},
    {"term": "Concurrent Care", "category": "Eligibility", "definition": "Care models where hospice services can be received alongside disease-directed treatment, typically for specific populations like pediatric or certain ACO arrangements."},
    {"term": "Anti-Kickback Statute (AKS)", "category": "Compliance", "definition": "Federal law prohibiting payment or inducement in exchange for patient referrals reimbursable by federal healthcare programs. Drives strict rules on gifts, education, and marketing in hospice."},
    {"term": "Stark Law", "category": "Compliance", "definition": "Federal physician self-referral law prohibiting referrals to entities with which the physician has a financial relationship, with strict exceptions."},
    {"term": "HIPAA", "category": "Compliance", "definition": "Health Insurance Portability and Accountability Act — federal law setting national standards for protecting patient health information (PHI). Restricts what sales reps can collect, store, or share."},
    {"term": "PHI (Protected Health Information)", "category": "Compliance", "definition": "Any individually identifiable health information held or transmitted by a covered entity or business associate, in any form."},
    {"term": "Referral Source", "category": "Sales", "definition": "Any clinical or community partner who refers patients to hospice — hospitals, SNFs, physicians, home health, ALFs, senior living, community organizations."},
    {"term": "Discharge Planner", "category": "Sales", "definition": "Hospital staff responsible for coordinating transitions of care. A primary referral source for hospice."},
    {"term": "Census", "category": "Operations", "definition": "The current number of patients receiving care from the hospice on a given day. Primary growth metric."},
    {"term": "ADC (Average Daily Census)", "category": "Operations", "definition": "Average number of patients on service over a period. Used for staffing, financial forecasting, and growth tracking."},
    {"term": "Admission", "category": "Operations", "definition": "A new patient starting hospice care. Tracked as a leading growth indicator."},
    {"term": "Time to Admit", "category": "Operations", "definition": "Elapsed time from referral received to patient admitted on service. Operational excellence metric — shorter is better."},
    {"term": "A/B/C Account Tiering", "category": "Territory Management", "definition": "Prioritization framework grouping referral sources by potential and engagement — A accounts get weekly attention, B accounts bi-weekly, C accounts monthly."},
    {"term": "Decline Indicators", "category": "Clinical", "definition": "Documented evidence of disease progression — weight loss, functional decline, recurrent hospitalizations, declining PPS, increased symptoms — used to support hospice eligibility."},
    {"term": "PPS (Palliative Performance Scale)", "category": "Clinical", "definition": "A clinical tool that measures functional status on a 0-100% scale. Lower PPS scores support hospice eligibility, especially when combined with disease-specific criteria."},
    {"term": "Plan of Care (POC)", "category": "Clinical", "definition": "The individualized care plan developed by the IDG addressing the patient's physical, psychosocial, and spiritual needs. Updated at every IDG meeting."},
    {"term": "Bereavement Services", "category": "Services", "definition": "Up to 13 months of grief support provided to the family of a hospice patient after death. Required by Medicare."},
    {"term": "Volunteer Services", "category": "Services", "definition": "Trained volunteers contributing companionship, respite, and administrative support. Medicare requires volunteers to provide at least 5% of total patient care hours."},
    {"term": "Election Period / Benefit Period", "category": "Eligibility", "definition": "Defined periods of hospice care under Medicare — two 90-day periods followed by unlimited 60-day periods, each requiring recertification."},
    {"term": "Face-to-Face Encounter (F2F)", "category": "Eligibility", "definition": "A required physician or nurse practitioner visit before the start of the third benefit period and every subsequent benefit period to confirm continued eligibility."},
    {"term": "Non-Cancer Diagnoses", "category": "Clinical", "definition": "Hospice eligibility increasingly involves non-cancer diagnoses including heart failure, COPD, dementia, ESRD, debility, and stroke. Each has specific LCD criteria."},
    {"term": "Concurrent Care for Children (ACA Section 2302)", "category": "Eligibility", "definition": "Provision allowing pediatric Medicaid patients to receive hospice care while continuing curative treatment for the terminal illness."},
    {"term": "Education-Based Outreach", "category": "Sales", "definition": "An ethical referral development approach focused on teaching clinical partners about hospice eligibility, processes, and outcomes — never on inducements."},
]
