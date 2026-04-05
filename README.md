# match-a

**Strengthening BC's nonprofit workforce through smart matching, crisis mobilization, retention prediction, and knowledge continuity.**

Built for youCode 2026 — SAP Challenge

🔗 [Live Demo](https://match-a-seven.vercel.app)

## The Problem

BC has 29,000 nonprofits contributing $6.7B to the economy. Volunteerism hasn't recovered to pre-pandemic levels and the gap is widening. Organizations are cutting programs because they don't have the people, and when volunteers do leave, their institutional knowledge disappears with them.

## Our Solution

match-a is a four-layer volunteer lifecycle platform:

**Match** — Volunteers complete an onboarding quiz (skills, languages, interests, availability). A weighted compatibility algorithm scores every opportunity against their profile.

**Mobilize** — When a nonprofit hits a critical gap, they post an urgent request. Matched volunteers receive real-time alerts via Supabase Realtime. One tap to accept.

**Retain** — A churn prediction engine extracts engagement features (days since active, hours trend, shift frequency, crisis response rate) and classifies volunteers as active, cooling, or at-risk. Coordinators see suggested check-in actions, not raw data.

**Preserve** — When volunteers leave, a handoff document captures their key contacts, recurring tasks, and tips. The next volunteer inherits it.

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Backend/Auth/DB:** Supabase (PostgreSQL, Auth, Realtime)
- **Matching:** Weighted multi-variable compatibility scoring
- **Retention:** Rule-based churn classifier with feature extraction pipeline
- **Hosting:** Vercel

## What We Learned

- First time building with Supabase Realtime subscriptions for live crisis alerts
- Designed and implemented a weighted matching algorithm with 5 scoring dimensions
- Built a churn prediction pipeline: feature extraction → classification → actionable output
- Learned role-based auth flows with Supabase Auth
- One of our team member's first time working with full stack development

## Design Constraints Addressed

- **No IT support:** Coordinator goes from signup to posting a request in under 3 minutes. No configuration.
- **Accessibility:** Language matching built into the data model. Onboarding uses tappable tags, not forms.
- **Sustainability:** Rule-based matching with no model decay. Runs identically on day 1 and day 180.
- **Trust & safety:** Background check field gates sensitive volunteer roles.
- **Don't rebuild what exists:** Platforms like Better Impact handle scheduling. We fill the gap nobody covers — acute crisis mobilization.

## Team

- Nicholas Huang
- Shlok Lande 
- Emily Tu
