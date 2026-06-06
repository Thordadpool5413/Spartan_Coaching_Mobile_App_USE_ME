"""
Static content ported from the SpartanCoaching GitHub repo (server/seed.ts).
Single source of truth for testimonials, case studies, articles, podcasts, and resources.
Mirrors the web app's content so the iOS app stays in lockstep.
"""

TESTIMONIALS = [
    {
        "id": "t-sarah-m",
        "name": "Sarah M.",
        "title": "Hospice Liaison",
        "company": "Regional Hospice Provider",
        "quote": "I was making visits but referrals stalled at 'we'll think about it.' Nick taught me to handle objections in the moment instead of leaving confused. My top five accounts now actually call me when they have an eligible patient.",
        "outcome": "Conversion rate from visit to referral increased 52% in first quarter. More conversions meant more patients received care earlier, because conversations that were stalling finally moved forward.",
        "category": "individual",
        "featured": True,
    },
    {
        "id": "t-james-t",
        "name": "James T.",
        "title": "Hospice Liaison",
        "company": "Multi-State Hospice Organization",
        "quote": "Before Spartan, I had a full calendar but no system. Nick showed me how to prioritize accounts that actually matter and build follow-up into my routine. I cut drive time by a third and admissions went up, not down.",
        "outcome": "Reduced weekly drive time from 18 hours to 12, referrals up 28%. Less time on the road meant better preparation for the visits that matter, and more families reached.",
        "category": "individual",
        "featured": False,
    },
    {
        "id": "t-maria-r",
        "name": "Maria R.",
        "title": "Hospice Liaison",
        "company": "Nonprofit Hospice",
        "quote": "The objection handling practice was brutal but necessary. I learned what to say when a social worker pushes back on timing or when a physician wants 'one more test.' Now I guide the conversation instead of reacting to it.",
        "outcome": "Average time from referral to admission dropped from 4.2 days to 2.6 days. Each day shorter is a day a patient spends less time managing symptoms without expert support.",
        "category": "individual",
        "featured": False,
    },
]


CASE_STUDIES = [
    {
        "id": "cs-territory-transformation",
        "title": "From Busy to Productive: Territory Transformation",
        "clientLabel": "Mid-Size Regional Hospice / Individual Rep Coaching",
        "challenge": "Experienced liaison was making 25+ visits per week but only converting 12% to referrals. Calendar packed with stops at low-volume accounts while high-opportunity SNFs received inconsistent attention. Objections from discharge planners went unanswered, causing deals to stall at 'we'll call you.'",
        "solution": "90-day intensive territory redesign: Mapped all 47 accounts by actual referral volume and patient demographics. Built A/B/C prioritization framework with specific visit frequency for each tier. Practiced objection handling for top three stall points. Implemented weekly pipeline review to track every active opportunity.",
        "results": [
            "Conversion rate climbed from 12% to 34% in 12 weeks",
            "Top 8 accounts now generate 67% of monthly referrals (was 28%)",
            "Weekly drive time reduced from 22 hours to 14 hours",
            "Lost zero deals to stall objections in final 30 days",
            "More patients received timely referrals as the conversion barriers that had stalled care were removed",
        ],
        "category": "individual",
    },
    {
        "id": "cs-coaching-system",
        "title": "Building a Coaching System That Sticks",
        "clientLabel": "For-Profit Hospice Provider / Sales Leadership Development",
        "challenge": "Director inherited a six-person team with wildly inconsistent results. Top performer hit 18 admissions monthly while bottom two averaged 4. No documented process, no structured coaching, and manager spent most time firefighting instead of developing talent. Team morale low, turnover high.",
        "solution": "Six-month leadership transformation: Built a weekly coaching rhythm with 15-minute one-on-ones focused on one skill at a time. Created a simple pipeline tracking system that takes 10 minutes to update. Trained manager to run structured field rides with clear observation criteria. Implemented new rep onboarding program with week-by-week milestones.",
        "results": [
            "All six reps hit monthly targets for four straight quarters",
            "Team average climbed from 9.2 to 14.6 admissions per rep per month",
            "Manager coaching time increased from 2 hours per week to 8 hours per week",
            "New rep time to first admission dropped from 11 weeks to 3.5 weeks",
            "Zero voluntary turnover in 12 months following implementation",
            "Faster onboarding and a higher-performing team meant fewer eligible patients went unserved in the market during that period",
        ],
        "category": "leadership",
    },
    {
        "id": "cs-multi-market",
        "title": "Scaling Execution Across Markets",
        "clientLabel": "Multi-State Hospice Organization / Corporate System Implementation",
        "challenge": "Ten markets operating as independent units with no shared process or common language. Executive team could not compare performance across regions or identify why some markets thrived while others struggled. New acquisitions took 18+ months to reach profitability.",
        "solution": "18-month enterprise transformation: Collaborated with top performers from each market to design one unified sales process. Trained all regional managers in the new system with emphasis on field application, not theory. Built simple performance dashboard that tracks leading indicators. Conducted quarterly calibration sessions where managers share what is working.",
        "results": [
            "All 10 markets now use identical account prioritization and follow-up framework",
            "Performance variance across markets reduced from 340% to 78%",
            "New acquisitions reach break-even in 7 months (was 19 months)",
            "System adoption measured at 91% compliance after 15 months",
            "Forecast accuracy improved from 58% to 86% at corporate level",
            "Referral volume up 37% year-over-year with same headcount",
            "With performance variance reduced and referral volume growing, more families across all 10 markets received access to care at the right time",
        ],
        "category": "corporate",
    },
]


ARTICLES = [
    {
        "id": "a-real-reason",
        "title": "The Real Reason Your Hospice Census Is Stuck",
        "description": "Most hospice organizations blame their census plateau on market conditions or competition. The truth is almost always internal. This article walks through the three most common internal barriers to census growth and what leadership can do about each one.",
        "linkedinUrl": "https://www.linkedin.com/pulse/real-reason-your-hospice-census-stuck-nicholas-lynch",
        "publishDate": "2025-11-12",
        "featured": True,
    },
    {
        "id": "a-territory-planning",
        "title": "Territory Planning Is Not Optional",
        "description": "The reps who consistently hit their numbers all share one thing in common: they plan their territory with precision. This article covers the basics of territory planning that most hospice organizations skip entirely, from account tiering to weekly route optimization.",
        "linkedinUrl": "https://www.linkedin.com/pulse/territory-planning-not-optional-nicholas-lynch",
        "publishDate": "2025-10-22",
        "featured": True,
    },
    {
        "id": "a-stop-cold-call",
        "title": "Stop Calling It a Cold Call",
        "description": "The phrase cold call creates the wrong mindset before you even pick up the phone. When you reframe outreach as education and relationship building, everything changes. Here is how to shift your thinking and your results.",
        "linkedinUrl": "https://www.linkedin.com/pulse/stop-calling-it-cold-call-nicholas-lynch",
        "publishDate": "2025-11-05",
        "featured": False,
    },
    {
        "id": "a-discharge-planners",
        "title": "What Your Discharge Planners Wish You Knew",
        "description": "After interviewing dozens of discharge planners across the country, the patterns are clear. They do not want another lunch. They do not want another brochure. They want reliability, responsiveness, and someone who makes their job easier. This article breaks down exactly what that looks like.",
        "linkedinUrl": "https://www.linkedin.com/pulse/what-your-discharge-planners-wish-you-knew-nicholas-lynch",
        "publishDate": "2025-10-29",
        "featured": False,
    },
    {
        "id": "a-coaching-convo",
        "title": "The Coaching Conversation Your Sales Manager Owes You",
        "description": "If your one on ones consist of 'how are your numbers looking,' you are not being coached. Real coaching means your manager is helping you think differently about your accounts, your conversations, and your process. This article outlines what a productive coaching conversation should include.",
        "linkedinUrl": "https://www.linkedin.com/pulse/coaching-conversation-your-sales-manager-owes-you-nicholas-lynch",
        "publishDate": "2025-10-15",
        "featured": False,
    },
    {
        "id": "a-empathy",
        "title": "Empathy Is Not a Sales Technique",
        "description": "Too many sales training programs teach empathy as a tactic. Something you say to get people to trust you. That is manipulation, not empathy. In hospice sales, genuine empathy means understanding what families and clinicians are going through and showing up accordingly. This article explores the difference.",
        "linkedinUrl": "https://www.linkedin.com/pulse/empathy-not-sales-technique-nicholas-lynch",
        "publishDate": "2025-10-08",
        "featured": False,
    },
    {
        "id": "a-five-signs",
        "title": "Five Signs Your Hospice Sales Team Needs Outside Help",
        "description": "Not every organization needs a consultant. But there are clear warning signs that internal coaching alone is not enough. High turnover among reps, a census that has flatlined for more than two quarters, and a team that cannot articulate their value proposition are just the start.",
        "linkedinUrl": "https://www.linkedin.com/pulse/five-signs-your-hospice-sales-team-needs-outside-help-nicholas-lynch",
        "publishDate": "2025-10-01",
        "featured": False,
    },
    {
        "id": "a-why-failure",
        "title": "Why Failure Is a Must: Essential Lessons for Personal Development and Success",
        "description": "Why failure is needed. Take a few moments and check out the article.",
        "linkedinUrl": "https://www.linkedin.com/posts/nicholas-lynch-coaching_why-failure-is-needed-take-a-few-moments-activity-7395222645656416256-oIr7",
        "publishDate": "2025-11-15",
        "featured": True,
    },
]


PODCASTS = [
    {"id": "p-001", "title": "The First 90 Days: Building Your Territory From Scratch", "description": "What does it actually look like to walk into a brand new territory with zero relationships? In this episode, Nick breaks down the exact steps a new hospice rep should take in their first 90 days. From mapping your territory to identifying your first 20 accounts, this is the playbook most companies never give you.", "episodeNumber": 1, "duration": "34:12"},
    {"id": "p-002", "title": "Why Most Hospice Reps Fail at Follow Up (And What to Do Instead)", "description": "Follow up is where most reps lose. Not because they do not try, but because they do it wrong. This episode covers the difference between checking in and adding value, how to build a follow up rhythm that does not feel pushy, and why most reps give up two conversations too early.", "episodeNumber": 2, "duration": "28:45"},
    {"id": "p-003", "title": "Understanding the Physician Referral: What Doctors Actually Want From You", "description": "Most hospice reps treat physician offices like any other referral source. They are not. In this episode, we cover what physicians actually need to hear, how to earn trust in a clinical setting, and the biggest mistakes reps make when approaching doctor offices.", "episodeNumber": 3, "duration": "31:20"},
    {"id": "p-004", "title": "Objection Handling: When the Facility Says They Already Have a Hospice Provider", "description": "This is the most common objection in the field and most reps handle it terribly. Nick walks through the real reason behind the objection, why competing on price never works, and the three step approach that opens doors even when someone else already has the contract.", "episodeNumber": 4, "duration": "26:58"},
    {"id": "p-005", "title": "Territory Management for the Rep Who Feels Overwhelmed", "description": "When you have 100 accounts and 20 workdays in a month, something has to give. This episode breaks down how to prioritize your accounts, when to cut underperforming sources, and how to build a weekly rhythm that keeps you consistent without burning out.", "episodeNumber": 5, "duration": "33:40"},
    {"id": "p-006", "title": "The Admission Conversation: What Happens After the Referral", "description": "Getting the referral is only half the battle. This episode covers the admission conversation with families, how to set expectations without overpromising, and the specific language that helps families feel confident about choosing hospice.", "episodeNumber": 6, "duration": "29:15"},
    {"id": "p-007", "title": "Building Real Relationships With Discharge Planners", "description": "Discharge planners are some of the busiest people in healthcare. If you want their referrals, you need to make their job easier, not harder. This episode covers what discharge planners actually care about, how to become their go to hospice contact, and the small things that separate great reps from average ones.", "episodeNumber": 7, "duration": "27:33"},
    {"id": "p-008", "title": "Clinical Conversations for Non Clinical Reps", "description": "You do not need a nursing degree to have credible clinical conversations. But you do need to understand the basics. This episode covers the clinical language every hospice rep should know, how to discuss eligibility criteria with confidence, and how to recognize when a patient might qualify even when the referral source is unsure.", "episodeNumber": 8, "duration": "35:08"},
    {"id": "p-009", "title": "Coaching Your Team: What Sales Leaders Get Wrong About Ride Alongs", "description": "Ride alongs should be the most valuable coaching tool a sales leader has. Instead, most leaders turn them into silent observation sessions or worse, take over the conversation entirely. This episode is for sales managers who want to coach effectively in the field.", "episodeNumber": 9, "duration": "30:22"},
    {"id": "p-010", "title": "The Ethics of Hospice Sales: Where the Line Actually Is", "description": "Selling hospice is not like selling any other product. There are real ethical boundaries that matter. This episode covers what ethical hospice sales looks like, where the line is between education and pressure, and how to build a career you can be proud of in this industry.", "episodeNumber": 10, "duration": "32:45"},
]


RESOURCES = [
    {"id": "r-cold-call-script", "title": "Cold Call Opening Script", "description": "Expert 30-second opening with psychology-backed framework. Includes Tier 1 & Tier 2 discovery questions, advanced objection handling, and credibility anchoring techniques. Science-based approach to healthcare decision-makers.", "category": "script"},
    {"id": "r-territory-template", "title": "Sales Territory Analysis Template", "description": "Professional territory planning with facility inventory analysis, opportunity sizing, account prioritization matrix (A/B/C priority), and revenue opportunity calculation. Complete strategic framework.", "category": "template"},
    {"id": "r-research-checklist", "title": "Pre-Call Research & Preparation Checklist", "description": "Expert two-week preparation framework. Two-week strategic assessment, one-week tactical prep, three-day materials development, logistics planning, execution framework, and post-call follow-up procedures.", "category": "checklist"},
    {"id": "r-regulations-guide", "title": "Medicare/Medicaid Hospice Regulations", "description": "Comprehensive compliance reference covering four federal eligibility criteria (42 CFR 418.24), disease-specific clinical guidelines (cancer, COPD, CHF, dementia, renal), and optimal 4-step referral process framework.", "category": "guide"},
    {"id": "r-facility-scripts", "title": "Facility-Type Specific Scripts", "description": "Expert cold call scripts customized for Acute Care Hospitals (24-48 hr windows, readmission penalties), Skilled Nursing Facilities (CMS therapy scrutiny), and Assisted Living (family satisfaction focus). Facility-specific pain points and responses.", "category": "script"},
    {"id": "r-followup-templates", "title": "Follow-Up Communication Framework", "description": "Advanced sequences for moving deals forward. Includes post-call email templates, 7-day nurture sequence, phone scripts with conditional responses, and 30-minute first strategy session structure with execution timeline.", "category": "template"},
    {"id": "r-weekly-activity", "title": "Weekly Activity Tracker", "description": "Track your daily conversations, referrals, and admissions across a full work week. Includes space for notes on each account visit and a weekly reflection section to identify patterns and improvement areas.", "category": "template"},
    {"id": "r-eligibility-ref", "title": "Hospice Eligibility Quick Reference", "description": "A concise reference card covering Medicare hospice eligibility criteria for the most common diagnoses. Includes specific decline indicators for cardiac, pulmonary, neurological, liver, renal, and cancer diagnoses.", "category": "guide"},
    {"id": "r-onboarding", "title": "New Hire Onboarding Checklist", "description": "A structured 90 day onboarding plan for new hospice sales representatives. Covers territory mapping, account research, initial outreach scripts, ride along preparation, and milestone checkpoints for weeks 1, 2, 4, 8, and 12.", "category": "checklist"},
    {"id": "r-lunch-learn", "title": "Lunch and Learn Presentation Template", "description": "A ready to customize presentation template for delivering educational lunch and learn sessions at referral sources. Covers hospice misconceptions, eligibility basics, and the referral process in a format designed for 15 to 20 minute sessions.", "category": "template"},
    {"id": "r-account-tiering", "title": "Account Tiering Worksheet", "description": "A practical worksheet for categorizing your referral sources into A, B, and C tiers based on referral volume, growth potential, and relationship strength. Includes guidelines for visit frequency by tier.", "category": "template"},
    {"id": "r-difficult-convo", "title": "Difficult Conversation Preparation Guide", "description": "A preparation framework for handling sensitive conversations with families, physicians, and facility staff about end of life care. Includes specific language recommendations and common scenarios with suggested approaches.", "category": "guide"},
]
