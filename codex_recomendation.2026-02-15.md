# iOS App Review (2026-02-15)

## High Severity (Fix Soon)

- **Hard-coded backend config**: `ios/Feymantec/Network/FeymantecAPIClient.swift:7` and `ios/Feymantec/Network/FeymantecAPIClient.swift:8` hard-code Supabase URL + anon key. The anon key can be public, but you still want environment switching (dev/stage/prod) and to avoid shipping accidental service-role keys. Recommendation: move to build settings (`.xcconfig`) or `Info.plist` keys and load at runtime.
- **Project portability/signing**: `DEVELOPMENT_TEAM` is committed in `ios/Feymantec/Feymantec.xcodeproj/project.pbxproj:360` (and multiple other places). This will break builds for other contributors. Recommendation: remove the team id from the project file and let each developer set signing locally.
- **Deployment target set to iOS 26.2**: `ios/Feymantec/Feymantec.xcodeproj/project.pbxproj:378` sets `IPHONEOS_DEPLOYMENT_TARGET = 26.2;`. Your Liquid Glass usage is already `#available(iOS 26, *)`, so you can lower the deployment target (e.g. iOS 17+) and keep the same UI fallbacks.
- **Networking + UI tightly coupled (race/cancellation risk)**: `ios/Feymantec/Views/FeynmanWizardView.swift:536` onward runs multiple `Task { ... }` calls that can finish after the user changes `concept`/`explanation` (or leaves a step), updating stale state. Recommendation: introduce a view model and cancel in-flight tasks when inputs/step changes (or use `.task(id:)` so SwiftUI cancels automatically).

## Medium Severity

- **Duplicate/unused code paths**:
  - `ios/FeymantecApp/` duplicates the actual Xcode app sources under `ios/Feymantec/`.
  - `ios/Feymantec/Views/PreviewCardView.swift` exists but isn't used anywhere (no `PreviewCardView(...)` call).
  - `ios/Feymantec/ContentView.swift` and `ios/Feymantec/Item.swift` are template SwiftData scaffolding and are unused (your app starts at `FeynmanWizardView`). Recommendation: delete or wire them intentionally.
- **State modeling smell**: `LearnState.loaded(introText:)` is reused for critique/feynman state (`ios/Feymantec/Views/FeynmanWizardView.swift:33` and `ios/Feymantec/Views/FeynmanWizardView.swift:37`) and then you store the real text elsewhere. Recommendation: replace with `Loadable<T>` (generic) or distinct enums per feature.
- **Repo hygiene**: Xcode build outputs show up as untracked (`ios/Feymantec/build/`, `ios/FeymantecCore/build/`, etc.). Add ignores for `ios/**/build/`, `ios/**/.build/`, and `**/*.xcuserdatad/`.

## Low Severity / UX Polish

- **Card step should show the \"card\"**: currently the \"card\" step is mostly AI critique + a \"Feynman\" generation button (`ios/Feymantec/Views/FeynmanWizardView.swift:263` onward). Recommendation: show `PreviewCardView(card: card)` as the baseline, then AI critique/feynman as tabs/sections.
- **Timer behavior**: pause/resume on background using `@Environment(\.scenePhase)` so time doesn't behave oddly when the app is backgrounded.

## Testing Recommendations

- Keep `ios/FeymantecCore` as the tested core. Now that Xcode is configured, prefer real unit tests (Swift Testing or XCTest) over the custom `FeymantecCoreTdd` executable, and add tests for:
  - `PreviewCardBuilder` edge cases
  - `TopicPolicy` policy list
  - `AIExplainRequest/Response` encoding/decoding + error decoding

## Suggested Next PR Sequence

1. **Hygiene + config**: move Supabase config out of source; remove committed `DEVELOPMENT_TEAM`; add gitignores.
2. **Refactor**: extract `FeynmanWizardViewModel` to own async calls + cancellation, keep views purely declarative.
3. **Product loop**: re-introduce the card view + ShareLink; add \"save card\" (SwiftData or Supabase) and a daily streak to make it habit-forming.
