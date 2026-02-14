# Feymantec iOS App (WIP)

This folder contains the initial SwiftUI implementation of the Feymantec iOS app UI.

## Local Setup

1. Ensure Xcode is installed and the license is accepted:
   - `sudo xcodebuild -license accept`
2. Create a new iOS app project in Xcode (SwiftUI lifecycle), then:
   - Add the local Swift package dependency at `ios/FeymantecCore`
   - Copy the Swift files from `ios/FeymantecApp/` into your app target

## Liquid Glass

UI uses iOS 26+ Liquid Glass where available:
- `glassEffect`, `GlassEffectContainer`
- `.buttonStyle(.glass)` / `.buttonStyle(.glassProminent)`

All Liquid Glass usage is availability-gated with fallbacks for earlier iOS versions.
