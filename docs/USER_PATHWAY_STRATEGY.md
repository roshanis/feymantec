# Feymantec User Pathway Strategy

## Executive Summary

This document outlines comprehensive user pathway strategies for three distinct user types in the Feymantec learning application. The strategy balances conversion optimization with user experience, ensuring each pathway delivers clear value while guiding users toward engagement and retention.

**Product Context:**
- Feymantec is a first-principles learning tool using the Feynman technique
- Core loop: Pick concept > Explain simply > Find gaps > Rewrite/analogy > Quick check
- Currently waitlist-based with demo functionality
- Target: Learners who want deep understanding, not memorization

---

## Pathway 1: New Users Just Browsing

### User Profile
- **Who:** Curious visitors, typically arriving via social shares, search, or word-of-mouth
- **Mindset:** "What is this? Why should I care?"
- **Goal:** Evaluate if Feymantec solves a problem they recognize
- **Time budget:** 30 seconds to 3 minutes before bounce decision

### Current State Analysis

**Strengths:**
- Clear headline: "Understand any concept in 5 minutes"
- Interactive Daily 5 timer card creates immediate engagement
- Demo section allows value testing without signup
- Social proof badge ("2,400+ learners on the waitlist")

**Weaknesses:**
- No immediate value demonstration (user must scroll to see demo)
- Hero CTA is "Try the card generator" which requires effort before value
- No example output visible above the fold
- "How it works" section requires reading vs. experiencing

### Recommended User Journey Map

```
ARRIVAL (0-10 seconds)
    |
    v
+-------------------------------------------+
|  INSTANT VALUE HOOK                       |
|  - See a completed Feynman card example   |
|  - Understand the transformation promise  |
|  - Social proof visible                   |
+-------------------------------------------+
    |
    v
CURIOSITY TRIGGER (10-30 seconds)
    |
    v
+-------------------------------------------+
|  DAILY 5 INTERACTION                      |
|  - Shuffle prompts (low commitment)       |
|  - See variety of topics                  |
|  - "Try demo with this" button            |
+-------------------------------------------+
    |
    v
EXPLORATION (30 seconds - 2 minutes)
    |
    v
+-------------------------------------------+
|  DEMO EXPERIENCE                          |
|  - Pre-filled example OR user input       |
|  - Generate card, see output              |
|  - "Aha moment" with gaps/clarity score   |
+-------------------------------------------+
    |
    v
CONVERSION TOUCHPOINTS
    |
    +---> Share card (viral loop)
    |
    +---> Join waitlist (primary CTA)
    |
    +---> Save for later (browser bookmark prompt)
```

### Key Screens/States

| State | Purpose | Key Elements |
|-------|---------|--------------|
| **Hero (Default)** | Hook attention | Headline, timer card, social proof, single CTA |
| **Hero (Engaged)** | Deepen interest | Daily 5 shuffled, prompt selected |
| **Demo (Empty)** | Guide first action | Pre-filled example visible, clear instructions |
| **Demo (Generating)** | Build anticipation | Loading state with progress indicator |
| **Demo (Complete)** | Deliver value | Full card output, share/download CTAs, waitlist nudge |
| **Share Modal** | Enable virality | Copy link, social buttons, referral incentive preview |

### Friction Points to Avoid

1. **Cognitive overload in hero:** Too many CTAs or navigation options
2. **Blank slate anxiety:** Empty demo form with no guidance
3. **Delayed value:** Requiring scroll or clicks before seeing what the product does
4. **Premature signup request:** Asking for email before demonstrating value
5. **Mobile frustration:** Demo textarea too small on phones

### Conversion Optimization Recommendations

#### High Priority

1. **Add "See Example" Pre-fill Option**
   - Auto-populate concept and explanation with a compelling example
   - User sees output immediately, then can try their own
   - Reduces "what do I write?" friction

2. **Show Mini-Card Preview in Hero**
   - Display a completed card thumbnail alongside the timer
   - Visual proof of output quality
   - Click expands or scrolls to demo

3. **Sticky CTA Bar on Scroll**
   - After scrolling past hero, show persistent "Try Demo" or "Join Waitlist"
   - Reduces navigation friction on long page

4. **Exit Intent Trigger**
   - On desktop: detect mouse moving to close tab
   - Show lightweight modal: "Before you go - try explaining one concept"
   - Not a hard sell, but a curiosity hook

#### Medium Priority

5. **Progressive Disclosure in Demo**
   - Show only concept input first
   - After concept entered, reveal explanation field
   - Reduces initial form intimidation

6. **Social Share Optimization**
   - Pre-written share text with user's concept
   - Twitter/X card preview optimization
   - Share count display (even if low, shows activity)

### Technical Implementation Considerations

```javascript
// Recommended localStorage keys for browsing user state
const BROWSE_STATE = {
  hasSeenDemo: 'feym_seen_demo',
  demoAttempts: 'feym_demo_attempts',
  lastPromptMode: 'feym_prompt_mode',
  exitIntentShown: 'feym_exit_intent'
};

// Track engagement without login
function trackBrowsingEngagement(event) {
  const events = JSON.parse(localStorage.getItem('feym_events') || '[]');
  events.push({ event, ts: Date.now() });
  localStorage.setItem('feym_events', JSON.stringify(events.slice(-50)));
}
```

**Key technical needs:**
- Lightweight analytics (page scroll depth, demo interactions)
- Session storage for demo state persistence
- Service worker for offline demo capability
- Optimized LCP (Largest Contentful Paint) for hero section

### Success Metrics

| Metric | Current Baseline | Target | Measurement |
|--------|------------------|--------|-------------|
| **Bounce Rate** | Unknown | <50% | Analytics |
| **Demo Engagement** | Unknown | >30% of visitors | Click tracking |
| **Demo Completion** | Unknown | >60% of starters | Event tracking |
| **Waitlist Conversion** | Unknown | >8% of visitors | Supabase |
| **Share Actions** | Unknown | >5% of demo completers | Click tracking |
| **Time on Page** | Unknown | >90 seconds avg | Analytics |

---

## Pathway 2: Existing Users Logging In

### User Profile
- **Who:** Waitlist members returning after signup, eventual paying users
- **Mindset:** "I'm ready to learn" or "Let me check my progress"
- **Goal:** Quick access to create/review cards, track progress
- **Time budget:** 5-15 minutes of focused learning

### Current State Analysis

**Strengths:**
- Login page exists with email OTP flow
- Clean, focused login UI
- Social login options (Google, Apple)

**Weaknesses:**
- No authenticated dashboard implemented
- No way to save/retrieve cards
- No progress visibility
- No personalization based on history
- Login page links to `/signup.html` which may not exist

### Recommended User Journey Map

```
RETURN VISIT
    |
    v
+-------------------------------------------+
|  QUICK AUTHENTICATION                     |
|  - Email pre-filled if remembered         |
|  - Social login 1-click                   |
|  - Magic link option                      |
+-------------------------------------------+
    |
    v
DASHBOARD LANDING
    |
    v
+-------------------------------------------+
|  PERSONALIZED HOME STATE                  |
|  - Today's streak status                  |
|  - Cards due for review                   |
|  - Continue where you left off            |
|  - Quick "Daily 5" access                 |
+-------------------------------------------+
    |
    v
PRIMARY ACTIONS
    |
    +---> New Card (from Daily 5 or custom)
    |
    +---> Review Queue (spaced repetition)
    |
    +---> My Cards (library)
    |
    +---> Profile/Stats
```

### Key Screens/States

| State | Purpose | Key Elements |
|-------|---------|--------------|
| **Login (Returning)** | Fast re-authentication | Pre-filled email, "Welcome back" message |
| **Dashboard (Empty)** | Guide first logged-in action | Prominent "Create First Card" CTA |
| **Dashboard (Active)** | Show progress, enable action | Streak, review count, recent cards |
| **Card Creation Flow** | Guide through 5-step loop | Wizard with progress bar |
| **Review Mode** | Spaced repetition | Card queue, self-assessment |
| **My Cards** | Library management | Search, filter, organize |
| **Profile** | Stats and settings | Clarity score average, streaks, preferences |

### Friction Points to Avoid

1. **Session timeout surprises:** Losing work due to auth expiry
2. **Cold start problem:** Empty dashboard feels dead
3. **Unclear next action:** Dashboard with too many equal-weight options
4. **Review fatigue:** Too many cards due at once
5. **Lost context:** Returning mid-card-creation with no save state

### Retention Features Recommendations

#### High Priority

1. **Streak System**
   - Daily login + 1 card = streak maintained
   - Streak freeze (earned or purchased) for missed days
   - Visual streak display (fire icon, count)

2. **Spaced Review Queue**
   - Day 1, 3, 7 review schedule
   - "Cards due today" badge/notification
   - Quick review mode (90-second re-teach)

3. **Progress Dashboard**
   - Total cards created
   - Average clarity score trend
   - Topics mastered (based on quiz performance)
   - Weekly/monthly learning time

4. **Personalized Daily 5**
   - "For You" mode uses past topics to suggest related concepts
   - Avoid repeating recently studied topics
   - Surface prerequisites for struggled concepts

#### Medium Priority

5. **Collections/Learning Paths**
   - Group cards into topic collections
   - Pre-built paths: "Understand Machine Learning" (10 cards)
   - Share collections publicly

6. **Achievement System**
   - Milestones: First card, 7-day streak, 50 cards
   - Badges displayed on profile
   - Unlock cosmetic rewards

### Technical Implementation Considerations

```javascript
// Dashboard data model
interface UserDashboard {
  user: {
    id: string;
    email: string;
    displayName: string;
    createdAt: Date;
  };
  streak: {
    current: number;
    longest: number;
    lastActiveDate: Date;
    freezesAvailable: number;
  };
  cards: {
    total: number;
    dueForReview: number;
    averageClarityScore: number;
  };
  recentActivity: Array<{
    cardId: string;
    concept: string;
    action: 'created' | 'reviewed' | 'shared';
    timestamp: Date;
  }>;
}

// Supabase table structure needed
// - user_profiles (extends auth.users)
// - cards (user_id, concept, explanation, score, created_at, etc.)
// - card_reviews (card_id, reviewed_at, self_rating)
// - user_streaks (user_id, current_streak, last_active)
```

**Key technical needs:**
- Real-time sync for card state
- Offline-capable card creation (sync when online)
- Push notification infrastructure (web + iOS)
- Background review scheduling

### Progress Visibility Features

| Feature | Implementation | User Value |
|---------|----------------|------------|
| **Streak Display** | Header badge, dashboard widget | Daily motivation |
| **Clarity Score Trend** | Line chart over time | Improvement tracking |
| **Topic Map** | Visual node graph of related cards | Knowledge architecture |
| **Review Calendar** | Heat map of daily activity | Habit visualization |
| **Leaderboard Position** | Relative ranking (optional) | Social motivation |

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **D7 Retention** | >40% | Return within 7 days |
| **D30 Retention** | >25% | Return within 30 days |
| **Cards per User (Monthly)** | >12 | Database count |
| **Avg Session Duration** | >8 minutes | Analytics |
| **Review Completion Rate** | >70% | Review events / due cards |
| **Streak Length (Median)** | >5 days | User streak data |

---

## Pathway 3: New Users Signing Up

### User Profile
- **Who:** Visitors who tried demo and want more, or arrived with high intent
- **Mindset:** "I want to use this regularly" or "Let me save my work"
- **Goal:** Create account, complete first meaningful action
- **Time budget:** 2-5 minutes for signup, then first session

### Current State Analysis

**Strengths:**
- Waitlist form is simple (email only)
- Referral system creates viral potential
- OTP flow (passwordless) reduces friction
- Social login options available

**Weaknesses:**
- No immediate value after waitlist signup (just "you're in")
- No onboarding flow to first card
- No preference capture during signup
- Referral incentive unclear (what do I get?)

### Recommended User Journey Map

```
SIGNUP DECISION
    |
    v
+-------------------------------------------+
|  FRICTIONLESS ACCOUNT CREATION            |
|  - Email or social (1-click)              |
|  - No password required                   |
|  - Clear value proposition reminder       |
+-------------------------------------------+
    |
    v
IMMEDIATE VALUE (0-60 seconds post-signup)
    |
    v
+-------------------------------------------+
|  FIRST CARD ONBOARDING                    |
|  - "Let's create your first card"         |
|  - Guided concept selection               |
|  - Simplified first-run experience        |
+-------------------------------------------+
    |
    v
ACTIVATION MILESTONE
    |
    v
+-------------------------------------------+
|  FIRST CARD COMPLETE                      |
|  - Celebration moment                     |
|  - Card saved to profile                  |
|  - Introduced to streak system            |
|  - Referral prompt (contextual)           |
+-------------------------------------------+
    |
    v
HABIT FORMATION HOOKS
    |
    +---> Enable notifications
    |
    +---> Set daily reminder time
    |
    +---> Share first card (optional)
```

### Key Screens/States

| State | Purpose | Key Elements |
|-------|---------|--------------|
| **Signup Form** | Capture email | Minimal form, social options, value reminder |
| **Email Verification** | Confirm identity | OTP input, clear instructions, resend option |
| **Welcome Screen** | Celebrate, orient | Welcome message, "Let's create your first card" |
| **Onboarding Step 1** | Choose topic | Daily 5 integration, or custom input |
| **Onboarding Step 2** | Write explanation | Timer visible, tips shown |
| **Onboarding Step 3** | Review output | Card generated, score explained |
| **Activation Complete** | Celebrate, hook | Achievement unlocked, next steps clear |

### Friction Points to Avoid

1. **Email verification drop-off:** User doesn't complete OTP
2. **Post-signup dead end:** "Thanks for signing up" with no next action
3. **Onboarding skip:** User closes before first card
4. **Overwhelming first run:** Too many features introduced at once
5. **Notification permission rejection:** Bad timing or unclear value

### Signup Flow Optimization

#### Pre-Signup

1. **Contextual Signup Prompts**
   - After demo completion: "Save this card to your profile"
   - After share: "Get credit when friends join"
   - On return visit: "Welcome back - sign up to keep your cards"

2. **Clear Value Proposition**
   - "Free forever: 3 cards/day, unlimited saves"
   - "No password needed - sign in with a code"

#### During Signup

3. **Progressive Profiling**
   - Phase 1 (Signup): Email only
   - Phase 2 (Post-first card): "What topics interest you?"
   - Phase 3 (Week 2): Display name for profile

4. **Social Proof in Flow**
   - "Join 2,400+ learners"
   - "3,500 cards created this week"

### Onboarding Experience Design

#### First-Run Wizard

```
Step 1: Welcome
- "Welcome to Feymantec, [name]!"
- Quick explanation of the 5-minute loop
- CTA: "Create your first card"

Step 2: Choose Concept
- Show Daily 5 prompts pre-selected
- Option to type custom concept
- "Pick something you think you understand"

Step 3: Explain
- Timer visible but not stressful
- Inline tips: "Start with the basics..."
- Word count guidance

Step 4: Review Card
- Show generated card
- Explain clarity score
- Highlight gaps as "areas to explore"

Step 5: Celebration
- Achievement: "First Card Created!"
- "Come back tomorrow to keep your streak"
- Optional: Enable daily reminder
- Optional: Share this card
```

#### Gamification Elements

| Element | Trigger | Reward |
|---------|---------|--------|
| **First Card Badge** | Complete card #1 | Badge on profile |
| **Perfect Week** | 7-day streak | Streak freeze unlock |
| **Clarity Climber** | Score >80 | Animated celebration |
| **Teacher's Pet** | Card shared by others | Notification + badge |

### First-Value Delivery

**Target:** User creates and saves first card within 3 minutes of signup completion

**Flow:**
1. Account created -> Redirect to onboarding wizard (not empty dashboard)
2. Wizard auto-starts with Daily 5 concept pre-filled
3. Explanation field has starter prompt
4. Generate card -> Immediate save to profile
5. Dashboard appears with card visible

### Activation Milestones

| Milestone | Definition | Target % | Timeframe |
|-----------|------------|----------|-----------|
| **Signup Complete** | Email verified | 100% | Immediate |
| **First Card Created** | Card saved to profile | >80% | 10 minutes |
| **Second Card Created** | Return engagement | >50% | 24 hours |
| **3-Day Streak** | Consistent habit | >30% | 72 hours |
| **Card Shared** | Viral action | >15% | 7 days |
| **Referral Sent** | Growth action | >10% | 7 days |

### Technical Implementation Considerations

```javascript
// Onboarding state machine
const ONBOARDING_STEPS = {
  SIGNUP: 'signup',
  VERIFY: 'verify',
  WELCOME: 'welcome',
  CHOOSE_TOPIC: 'choose_topic',
  EXPLAIN: 'explain',
  REVIEW: 'review',
  COMPLETE: 'complete'
};

// Track onboarding progress
interface OnboardingState {
  userId: string;
  currentStep: string;
  startedAt: Date;
  completedAt: Date | null;
  skippedAt: Date | null;
  firstCardId: string | null;
}

// Supabase function to track activation
async function trackActivation(userId: string, event: string) {
  await supabase.from('user_activation_events').insert({
    user_id: userId,
    event_name: event,
    occurred_at: new Date().toISOString()
  });
}
```

**Key technical needs:**
- Onboarding state persistence (survive page refresh)
- Interruptible flow (can close and resume)
- A/B testing infrastructure for onboarding variants
- Event tracking for funnel analysis

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Signup Completion Rate** | >85% | Started / Completed |
| **Onboarding Completion** | >70% | Started / First card |
| **Time to First Card** | <5 minutes | Timestamp delta |
| **D1 Retention** | >60% | Return within 24h |
| **Activation Rate** | >50% | 3+ cards in first week |

---

## Implementation Priority Matrix

### Phase 1: Foundation (Weeks 1-2)

| Item | Pathway | Effort | Impact |
|------|---------|--------|--------|
| Add demo pre-fill example | Browsing | Low | High |
| Implement basic dashboard | Logged-in | High | High |
| Create onboarding wizard | Signup | Medium | High |
| Add card persistence (Supabase) | All | Medium | Critical |

### Phase 2: Engagement (Weeks 3-4)

| Item | Pathway | Effort | Impact |
|------|---------|--------|--------|
| Streak system | Logged-in | Medium | High |
| Review queue (basic) | Logged-in | Medium | High |
| First-card celebration | Signup | Low | Medium |
| Sticky CTA bar | Browsing | Low | Medium |

### Phase 3: Growth (Weeks 5-6)

| Item | Pathway | Effort | Impact |
|------|---------|--------|--------|
| Referral tracking dashboard | Signup | Medium | Medium |
| Share optimization | Browsing | Low | Medium |
| Notification system | Logged-in | High | High |
| Achievement system | All | Medium | Medium |

### Phase 4: Optimization (Weeks 7-8)

| Item | Pathway | Effort | Impact |
|------|---------|--------|--------|
| A/B testing framework | All | Medium | High |
| Advanced analytics | All | Medium | Medium |
| Personalized Daily 5 | Logged-in | High | Medium |
| Exit intent modal | Browsing | Low | Low |

---

## Cross-Pathway Considerations

### Data Flow

```
Browsing User                 Signed Up User               Logged In User
     |                              |                            |
     v                              v                            v
[localStorage]                [localStorage]               [localStorage]
     |                         +   |                        +   |
     |                       [Supabase]                   [Supabase]
     |                              |                            |
     +-------- MIGRATION ---------->+                            |
              (on signup)                                        |
                                    +-------- SYNC ------------->+
                                           (on login)
```

### Consistent Design Language

- **CTAs:** Always use `.btn--solid` for primary, `.btn--ghost` for secondary
- **Progress:** Consistent progress bar component across onboarding/card creation
- **Celebrations:** Consistent animation style for achievements
- **Errors:** Consistent error message format and placement

### Mobile-First Priorities

1. Demo textarea must be comfortable on phone keyboards
2. Card output must be readable without zooming
3. Onboarding must work portrait-only
4. Touch targets minimum 44x44px

---

## Appendix: Competitive Analysis Summary

| Competitor | Strength to Adopt | Weakness to Avoid |
|------------|-------------------|-------------------|
| Duolingo | Streak/gamification | Excessive notifications |
| Anki | Spaced repetition | Poor UX/onboarding |
| Notion | Flexibility | Overwhelming blank slate |
| Headspace | Calm onboarding | Paywall frustration |
| Brilliant | Visual learning | Premium-only content |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-14 | Product Team | Initial strategy document |

---

*This document should be reviewed and updated quarterly or when significant product changes occur.*
