import SwiftUI

public enum FeymantecGlass {
  public static let cardRadius: CGFloat = 28
}

public extension View {
  @ViewBuilder
  func fey_glassCard(
    tint: Color = .white.opacity(0.10),
    cornerRadius: CGFloat = FeymantecGlass.cardRadius,
    interactive: Bool = false
  ) -> some View {
    if #available(iOS 26, macOS 26, visionOS 26, *) {
      #if targetEnvironment(simulator)
      // iOS 26 simulator currently has gesture/scroll issues with Liquid Glass.
      // Prefer stable material rendering in simulator builds.
      self
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .overlay(
          RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .strokeBorder(.white.opacity(0.12), lineWidth: 1)
        )
      #else
      self
        .glassEffect(.regular.tint(tint).interactive(interactive), in: .rect(cornerRadius: cornerRadius))
      #endif
    } else {
      self
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .overlay(
          RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .strokeBorder(.white.opacity(0.12), lineWidth: 1)
        )
    }
  }

  @ViewBuilder
  func fey_glassChip(
    tint: Color = .white.opacity(0.06),
    cornerRadius: CGFloat = 999,
    interactive: Bool = false
  ) -> some View {
    if #available(iOS 26, macOS 26, visionOS 26, *) {
      #if targetEnvironment(simulator)
      self
        .background(.ultraThinMaterial, in: Capsule(style: .continuous))
        .overlay(
          Capsule(style: .continuous)
            .strokeBorder(.white.opacity(0.10), lineWidth: 1)
        )
      #else
      self
        // Note: iOS 26 Liquid Glass currently exposes `.regular` (no `.thin`).
        .glassEffect(.regular.tint(tint).interactive(interactive), in: .capsule)
      #endif
    } else {
      self
        .background(.ultraThinMaterial, in: Capsule(style: .continuous))
        .overlay(
          Capsule(style: .continuous)
            .strokeBorder(.white.opacity(0.10), lineWidth: 1)
        )
    }
  }

  @ViewBuilder
  func fey_primaryButtonStyle() -> some View {
    if #available(iOS 26, macOS 26, visionOS 26, *) {
      #if targetEnvironment(simulator)
      self.buttonStyle(.borderedProminent)
      #else
      self.buttonStyle(.glassProminent)
      #endif
    } else {
      self.buttonStyle(.borderedProminent)
    }
  }

  @ViewBuilder
  func fey_secondaryButtonStyle() -> some View {
    if #available(iOS 26, macOS 26, visionOS 26, *) {
      #if targetEnvironment(simulator)
      self.buttonStyle(.bordered)
      #else
      self.buttonStyle(.glass)
      #endif
    } else {
      self.buttonStyle(.bordered)
    }
  }

  @ViewBuilder
  func fey_glassEffectID(_ id: String, in namespace: Namespace.ID) -> some View {
    if #available(iOS 26, macOS 26, visionOS 26, *) {
      #if targetEnvironment(simulator)
      self
      #else
      self.glassEffectID(id, in: namespace)
      #endif
    } else {
      self
    }
  }
}

public struct FeymantecGlassContainer<Content: View>: View {
  private let spacing: CGFloat
  private let content: Content

  public init(spacing: CGFloat = 18, @ViewBuilder content: () -> Content) {
    self.spacing = spacing
    self.content = content()
  }

  public var body: some View {
    // iOS 26 simulator has intermittent gesture/scroll issues when content is wrapped
    // in `GlassEffectContainer`. Prefer the plain fallback on simulator builds.
    #if targetEnvironment(simulator)
    content
    #else
    if #available(iOS 26, macOS 26, visionOS 26, *) {
      GlassEffectContainer(spacing: spacing) {
        content
      }
    } else {
      content
    }
    #endif
  }
}
