# Feymantec iOS App (WIP)

This folder contains the initial SwiftUI implementation of the Feymantec iOS app UI (views + design helpers).

## Local Setup

1. Create an iOS App in Xcode:
   - Xcode -> File -> New -> Project... -> iOS -> App
   - Interface: SwiftUI, Language: Swift
   - Save it under `ios/` (example: `ios/FeymantecXcode/`)

2. Add the local package dependency:
   - In Xcode, select your project in the left sidebar
   - Go to "Package Dependencies" -> "+"
   - Add Local... -> pick `ios/FeymantecCore`

3. Add the UI files to your app target:
   - Drag `ios/FeymantecApp/Design/` and `ios/FeymantecApp/Views/` into Xcode
   - In the add-files dialog: ensure "Add to targets" includes your app target

## Liquid Glass

UI uses iOS 26+ Liquid Glass where available:
- `glassEffect`, `GlassEffectContainer`
- `.buttonStyle(.glass)` / `.buttonStyle(.glassProminent)`

All Liquid Glass usage is availability-gated with fallbacks for earlier iOS versions.

## App Entry Point

Xcode creates an `@main` `App` type (example: `YourAppApp.swift`). Set your root view to:

```swift
WindowGroup {
  FeynmanWizardView()
}
```
