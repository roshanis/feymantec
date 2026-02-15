# iOS App Review (2026-02-16)

## What Improved Since 2026-02-15

- Removed the duplicate iOS source tree (`ios/FeymantecApp/`) and cleaned up template files, leaving `ios/Feymantec/` as the canonical app.
- `FeynmanWizardView` is materially better: generic `AsyncState<T>`, clearer error messaging, haptics, `scenePhase` timer handling, and a `ShareLink` on the card step (`ios/Feymantec/Views/FeynmanWizardView.swift`).
- Added `DailyPrompts.today` and wired it into “Try a prompt” (`ios/FeymantecCore/Sources/FeymantecCore/DailyPrompts.swift`).
- Consolidated Liquid Glass helpers into the Swift package with good `#available` fallbacks (`ios/FeymantecCore/Sources/FeymantecCore/FeymantecGlass.swift`).
- Edge function is safer and more product-aligned: new `intro` and `feynman` modes, server-side NSFW block, input length cap, and basic rate limiting (`supabase/functions/ai-explain/index.ts`).
- Core logic is testable and currently green via `swift run FeymantecCoreTdd` (`ios/FeymantecCore/Sources/FeymantecCoreTdd/main.swift`).

## High Priority (Fix Soon)

- **Xcode project portability**: `DEVELOPMENT_TEAM` is committed in `ios/Feymantec/Feymantec.xcodeproj/project.pbxproj` (example: line ~344). This breaks builds for other contributors. Remove it from the project file and rely on local signing.
- **Deployment target locked to iOS 26.2**: `IPHONEOS_DEPLOYMENT_TARGET = 26.2;` is still set in `ios/Feymantec/Feymantec.xcodeproj/project.pbxproj` (example: line ~362). Consider lowering to iOS 17+ while keeping Liquid Glass behind `#available(iOS 26, *)`.
- **Hard-coded Supabase config in app**: `ios/Feymantec/Network/FeymantecAPIClient.swift` embeds the Supabase function base URL and anon key. The anon key is not secret, but you still want environment switching and guardrails against accidentally shipping a service-role key. Move these to `Info.plist` or `.xcconfig`, and validate at startup.
- **Async cancellation / stale updates**: `Task { ... }` calls in `ios/Feymantec/Views/FeynmanWizardView.swift` (intro/critique/feynman) are not cancelled when the user navigates or edits. Extract a `@StateObject` view model and use `.task(id:)` or explicit `Task` handles with cancellation.

## Medium Priority

- **Package layering**: `FeymantecCore` now imports SwiftUI because `FeymantecGlass` lives there. If you want a “pure core” for future reuse (server, CLI, etc.), split into `FeymantecCore` (Foundation-only) and `FeymantecUI` (SwiftUI).
- **Card step is not a “card” yet**: you have `PreviewCardBuilder`, but the app doesn’t use it to render an immediate local card. Recommendation: generate a local `PreviewCard` instantly on “Make card”, then stream in AI critique as an enhancement.
- **Edge function hardening**: wrap the OpenAI `fetch(...)` in `try/catch` and return a clear 502 on network failures. Consider a more durable rate limit (per-user quota or KV-backed) if this is going public.

## Low Priority / Polish

- Repo guideline says “prefer ASCII”; UI strings in `ios/Feymantec/Views/FeynmanWizardView.swift` contain curly apostrophes (“We’ll”, “isn’t”, “you’re”). Either normalize strings to ASCII or relax the guideline for UI copy.
- Add 2-3 UI tests (happy path, NSFW block, offline/server error) to make refactors safer (`ios/Feymantec/FeymantecUITests/` is still template).

## “Addictive” Product Loop (Concrete Suggestions)

- Daily prompt + streak: show a simple streak chip on the header, and a micro-celebration when a card is completed.
- Save history: store completed cards locally first (SwiftData), then sync later. Habit comes from a visible “collection”.
- Variable reward: reveal one “great analogy” or “most people get this wrong…” moment after the timer ends to make finishing feel rewarding.
- Sharing: upgrade share from text to a shareable image card (rendered SwiftUI view -> image -> share sheet).

## Suggested Next PR Sequence

1. Portability + config: remove committed signing, lower deployment target, move Supabase URL/key to config.
2. Architecture: introduce `FeynmanWizardViewModel` with cancellable async calls and better error typing (status codes, 429 messaging).
3. Habit-forming: local card rendering (`PreviewCardBuilder`), persistence (SwiftData), streak + lightweight review queue.

