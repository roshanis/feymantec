# Feymantec Code Review & Recommendations

**Date:** 2026-02-15
**Reviewer:** Claude Opus 4.6
**Scope:** iOS app, FeymantecCore package, Supabase edge function, web frontend, database migrations, project structure

---

## 1. Project Overview

Feymantec is a learning app built around the Feynman Technique — users pick a topic, receive an AI-generated introduction, explain it in their own words under a timer, and receive AI critique. The project consists of:

- **iOS app** (SwiftUI, iOS 16+, Swift 6.2)
- **FeymantecCore** Swift package (shared design tokens and utilities)
- **Supabase backend** (Postgres + Auth + Edge Functions)
- **OpenAI GPT-5.2** for AI generation
- **Static web frontend** (landing page + daily prompts)

---

## 2. Architecture Summary

```
feymantec/
├── ios/
│   ├── Feymantec/          ← Main Xcode project
│   ├── FeymantecApp/       ← ⚠️ Duplicate of Feymantec (see §3a)
│   └── FeymantecCore/      ← Swift package (design tokens, shared code)
├── supabase/
│   ├── functions/ai-explain/  ← Edge function (Deno/TypeScript)
│   └── migrations/            ← 8 Postgres migrations
└── web/                       ← Static landing site
```

**Tech stack:** SwiftUI (iOS 16+), Swift 6.2, Supabase (Postgres + Auth + Edge Functions), OpenAI GPT-5.2

---

## 3. Critical Issues (P0)

### 3a. Duplicate directory: `ios/FeymantecApp/`

`ios/FeymantecApp/` is a byte-for-byte copy of `ios/Feymantec/` — same Views, Network, and Design directories.

| Directory | Files |
|-----------|-------|
| `ios/Feymantec/Views/` | FeynmanWizardView, PreviewCardView, etc. |
| `ios/FeymantecApp/Views/` | Identical copies of above |

**Impact:** Every change must be made in two places. Divergence is inevitable.

**Recommendation:** Delete `ios/FeymantecApp/` entirely. It is not referenced by the Xcode project.

---

### 3b. `FeymantecGlass.swift` duplicated 5 times

The same 94-line file (`FeymantecGlass.swift`) exists in 5 locations:

1. `ios/FeymantecApp/Design/`
2. `ios/Feymantec/Feymantec/Design/`
3. `ios/Feymantec/FeymantecUITests/Design/`
4. `ios/FeymantecCore/FeymantecCoreTdd/Design/`
5. `ios/FeymantecCore/Design/` (root level, outside Sources)

**Recommendation:** Canonical location should be `ios/FeymantecCore/Sources/FeymantecCore/`. All other copies should be deleted and consumers should `import FeymantecCore`.

---

### 3c. ScrollView not scrolling on card step

Persistent issue across iOS 26 simulator. Root cause analysis points to interference from:

- `GlassEffectContainer` wrapping the scroll content
- `.animation()` modifier on the container
- `Spacer()` elements competing for layout space

Current workaround uses a separate `VStack` outside `GlassEffectContainer` for the card step, but the issue is still reported as broken.

**Recommendation:** Test on a real device. If still broken, consider replacing `ScrollView` with a `List` or `LazyVStack` inside a plain container, removing glass effect from scrollable content entirely.

---

## 4. Dead Code (P1)

### 4a. Files to delete

| File | Reason |
|------|--------|
| `ios/Feymantec/Feymantec/ContentView.swift` | Xcode template, never referenced |
| `ios/Feymantec/Feymantec/Item.swift` | SwiftData model, only used by dead ContentView |

### 4b. Unused code in `FeynmanWizardView.swift`

- **`import Combine`** — no Publishers, Subscribers, or Combine types used
- **`private var card: PreviewCard`** (~line 46) — computed property, never referenced after `PreviewCardView` was removed from card step
- **`private func shareText(_ card:)`** (~line 612) — never called, remnant of removed Share button

### 4c. Orphaned view

`ios/Feymantec/Views/PreviewCardView.swift` is no longer used in the card step. Either delete it or re-integrate it into the card step layout.

---

## 5. State Management (P1)

### 5a. `LearnState` enum misused

```swift
enum LearnState {
    case idle
    case loading
    case loaded(introText: String)
    case error(String)
}
```

`LearnState.loaded(introText:)` is reused for critique and feynman states, but those pass `""` as the `introText` — the associated value is meaningless in those contexts.

**Recommendation:** Either:
- Create a generic `AsyncState<T>` enum, or
- Use separate enums for intro vs. critique/feynman loading states

### 5b. Too many loose `@State` vars for card step

Six separate `@State` properties manage critique + feynman state:

```swift
@State private var critiqueState: LearnState = .idle
@State private var critiqueText: String = ""
@State private var critiqueSuggestions: [String] = []
@State private var critiqueScore: Int? = nil
@State private var feynmanState: LearnState = .idle
@State private var feynmanText: String = ""
```

**Recommendation:** Group into a struct or extract into an `@Observable` ViewModel:

```swift
@Observable class CardStepViewModel {
    var critiqueState: AsyncState<CritiqueResult> = .idle
    var feynmanState: AsyncState<String> = .idle
}
```

### 5c. Intro cache is memory-only

`introCache: [String: String]` resets every time the view is recreated (e.g., on navigation). If caching is intentional, consider persisting to `UserDefaults` or documenting the design choice.

---

## 6. Network Layer (P1)

### 6a. No request timeout

`URLRequest` uses the system default timeout (60 seconds). For AI generation endpoints that may hang:

```swift
urlRequest.timeoutInterval = 30
```

### 6b. Hardcoded credentials in source

`FeymantecAPIClient.swift` (line ~8) contains the Supabase anon key directly in source code. While anon keys are publishable (designed for client-side use), extracting them to `Info.plist` or a config file enables environment switching (dev/staging/prod).

### 6c. Generic error messages

All three fetch functions (`fetchIntro`, `fetchCritique`, `fetchFeynman`) show the same error message regardless of the actual failure:

> "Check your connection and try again"

A 400 (bad request), 502 (edge function crash), timeout, and JSON decode error all surface identically.

**Recommendation:** Differentiate by `URLError.code` or HTTP status code:
- Timeout → "Request timed out. Try again."
- 4xx → "Invalid request. Check your topic and try again."
- 5xx → "Server error. Please try again later."
- Decode error → "Unexpected response format."

### 6d. Conversation context never sent

`AIExplainRequest.conversation` is always `[]`. The edge function supports up to 6 turns of conversation context, but the iOS app never accumulates or sends prior turns.

**Recommendation:** Accumulate the user's explanation + AI critique as conversation turns before calling the Feynman endpoint. This would give significantly richer context for the Feynman-mode response.

---

## 7. Edge Function (P2)

### 7a. NSFW filter is client-side only

`TopicPolicy.isLikelyNSFW()` runs in Swift, but the edge function (`ai-explain/index.ts`) has no equivalent server-side validation. An attacker can bypass the filter by calling the API directly.

**Recommendation:** Add a server-side topic validation check in `index.ts` before forwarding to OpenAI.

### 7b. No rate limiting

The edge function has no per-user or per-IP rate limiting. Without authentication or throttling, any client can make unlimited requests, leading to potential OpenAI API cost abuse.

**Recommendation:**
- Require Supabase Auth (JWT) for API access, or
- Add rate limiting middleware (e.g., Supabase's built-in rate limiting, or a simple in-memory counter per IP)

### 7c. Edge function deployment

Recent commits added "feynman" mode and an improved critique prompt. These changes only take effect after running:

```bash
supabase functions deploy ai-explain
```

**Recommendation:** Add this to a CI/CD pipeline so deployments happen automatically on merge to main.

---

## 8. Test Coverage (P2)

### 8a. iOS tests are empty shells

| File | Status |
|------|--------|
| `FeymantecTests.swift` | 1 example test, no real assertions |
| `FeymantecUITests.swift` | Empty test methods |
| `FeymantecUITestsLaunchTests.swift` | Only captures a screenshot |

**Recommendation:** Add unit tests for:
- `PreviewCardBuilder` — verify card construction from API response
- `TopicPolicy` — verify NSFW detection, length limits
- `FeymantecAPIClient` — mock `URLSession` to test request construction and error handling

### 8b. FeymantecCoreTdd has good coverage but non-standard format

The 10 test cases in `FeymantecCoreTdd` run as a Swift executable (`@main`), not via XCTest. This works but doesn't integrate with Xcode's test runner or CI.

**Recommendation:** Migrate to Swift Testing (`@Test`) or XCTest format for Xcode integration and CI compatibility.

---

## 9. UI/UX (P2)

### 9a. No haptic feedback

Step transitions, button taps, and AI load completion have no haptic feedback. Adding `UIImpactFeedbackGenerator` on key interactions would improve perceived quality.

### 9b. "Try a prompt" always suggests the same topic

The placeholder is hardcoded to "TCP congestion control". The web frontend has 15 rotating daily prompts.

**Recommendation:** Share the prompt pool with iOS — either embed the list or fetch it from Supabase.

### 9c. Timer continues when app is backgrounded

`Timer.publish` may fire erratically or accumulate when the app is backgrounded and resumed.

**Recommendation:** Use actual `Date` comparison for remaining time instead of decrementing a counter:

```swift
let elapsed = Date().timeIntervalSince(startTime)
let remaining = max(0, totalDuration - elapsed)
```

### 9d. No accessibility for AI feedback loading

`ProgressView` spinner has no `.accessibilityLabel`. VoiceOver users won't know AI feedback is loading.

```swift
ProgressView()
    .accessibilityLabel("Loading AI feedback")
```

### 9e. Card step has no share functionality

The Share button was removed and replaced with the Feynman button. Consider adding share back alongside Feynman — users may want to share their learning cards.

---

## 10. Project Structure (P3)

### 10a. No `.gitignore` for iOS build artifacts

```
ios/Feymantec/build/                    ← untracked, should be ignored
ios/FeymantecCore/build/                ← untracked, should be ignored
ios/Feymantec/...xcuserdata/            ← being tracked, should be ignored
```

**Recommendation:** Add to `.gitignore`:

```gitignore
# Xcode
**/build/
**/xcuserdata/
*.xcuserstate
**/*.xcodeproj/project.xcworkspace/xcuserdata/
```

### 10b. No CI/CD pipeline

No `.github/workflows/` directory exists.

**Recommendation:** Add GitHub Actions for:
- `xcodebuild test` on PR
- `supabase functions deploy` on merge to main
- Web asset deployment

### 10c. Phantom staging entry for `FeymantecGlass.swift`

Git status shows `FeymantecCore/Sources/Design/FeymantecGlass.swift` as `AD` (added then deleted). This is a phantom entry in the staging area that should be cleaned up:

```bash
git reset HEAD ios/FeymantecCore/Sources/Design/FeymantecGlass.swift
```

---

## 11. Database Schema (Informational)

The Supabase database has 8 migrations covering:

- Waitlist and auth
- User profiles
- Cards and reviews
- Streaks
- Activation events
- SM-2 spaced repetition algorithm (PL/pgSQL triggers)
- RLS policies for user data isolation

**Current state:** The iOS app does not use any of this infrastructure — no auth, no card persistence, no streaks.

**Future work:** Wire up card saving, user profiles, and spaced repetition from the iOS app to unlock the full backend capabilities.

---

## Summary by Priority

| Priority | Count | Items |
|----------|-------|-------|
| **P0 — Critical** | 3 | Duplicate directory, 5x duplicated file, ScrollView broken |
| **P1 — Important** | 7 | Dead code (3), state management (3), network issues (4) |
| **P2 — Moderate** | 7 | Edge function security (3), test coverage (2), UI/UX (5) |
| **P3 — Low** | 3 | Gitignore, CI/CD, phantom git entry |

**Quick wins (< 30 min each):**
1. Delete `ios/FeymantecApp/` directory
2. Delete dead files (ContentView.swift, Item.swift)
3. Remove unused imports and functions from FeynmanWizardView
4. Add `.gitignore` rules for build artifacts
5. Add request timeout to URLRequest
6. Add `.accessibilityLabel` to ProgressView
