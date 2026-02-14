import SwiftUI
import FeymantecCore

struct PreviewCardView: View {
  let card: PreviewCard

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .firstTextBaseline) {
        Text(card.concept.isEmpty ? "Untitled" : card.concept)
          .font(.system(size: 20, weight: .bold, design: .rounded))
          .foregroundStyle(.white)

        Spacer(minLength: 0)

        Text("\(card.score)")
          .font(.system(size: 14, weight: .bold, design: .rounded))
          .foregroundStyle(.white)
          .padding(.vertical, 8)
          .padding(.horizontal, 10)
          .fey_glassChip(tint: .white.opacity(0.10), interactive: false)
          .accessibilityLabel("Clarity score")
      }

      section("Gaps") {
        ForEach(card.gaps, id: \.self) { g in
          Text("• \(g)")
            .foregroundStyle(.white.opacity(0.85))
        }
      }

      section("Simpler") {
        ForEach(card.simple, id: \.self) { s in
          Text(s)
            .foregroundStyle(.white.opacity(0.85))
        }
      }

      section("Analogy") {
        Text(card.analogy)
          .foregroundStyle(.white.opacity(0.85))
      }

      section("Quick check") {
        ForEach(Array(card.quiz.enumerated()), id: \.offset) { _, item in
          VStack(alignment: .leading, spacing: 6) {
            Text(item.q)
              .font(.system(size: 14, weight: .semibold, design: .rounded))
              .foregroundStyle(.white)
            Text(item.a)
              .font(.system(size: 12, weight: .medium, design: .rounded))
              .foregroundStyle(.white.opacity(0.70))
          }
          .padding(12)
          .fey_glassCard(tint: .white.opacity(0.06), cornerRadius: 18, interactive: false)
        }
      }
    }
  }

  @ViewBuilder
  private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(title)
        .font(.system(size: 14, weight: .bold, design: .rounded))
        .foregroundStyle(.white)

      VStack(alignment: .leading, spacing: 8) {
        content()
      }
      .font(.system(size: 13, weight: .medium, design: .rounded))
    }
  }
}
