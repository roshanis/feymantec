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
      self
        .glassEffect(.regular.tint(tint).interactive(interactive), in: .rect(cornerRadius: cornerRadius))
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
      self
        // Note: iOS 26 Liquid Glass currently exposes `.regular` (no `.thin`).
        .glassEffect(.regular.tint(tint).interactive(interactive), in: .capsule)
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
      self.buttonStyle(.glassProminent)
    } else {
      self.buttonStyle(.borderedProminent)
    }
  }

  @ViewBuilder
  func fey_secondaryButtonStyle() -> some View {
    if #available(iOS 26, macOS 26, visionOS 26, *) {
      self.buttonStyle(.glass)
    } else {
      self.buttonStyle(.bordered)
    }
  }

  @ViewBuilder
  func fey_glassEffectID(_ id: String, in namespace: Namespace.ID) -> some View {
    if #available(iOS 26, macOS 26, visionOS 26, *) {
      self.glassEffectID(id, in: namespace)
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
    if #available(iOS 26, macOS 26, visionOS 26, *) {
      GlassEffectContainer(spacing: spacing) {
        content
      }
    } else {
      content
    }
  }
}
