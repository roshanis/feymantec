import SwiftUI
import FeymantecCore

struct FeynmanWizardView: View {
  enum Step: Int {
    case pick
    case explain
    case card
  }

  @State private var step: Step = .pick
  @State private var concept: String = ""
  @State private var explanation: String = ""
  @State private var remainingSeconds: Int = 5 * 60
  @State private var timerActive: Bool = false
  @State private var lastTick: Date = .now

  @Namespace private var glassNamespace

  private var isBlocked: Bool {
    TopicPolicy.isLikelyNSFW(concept)
  }

  private var card: PreviewCard {
    PreviewCardBuilder.buildPreviewCard(concept: concept.fey_safeTrim(), v1: explanation)
  }

  var body: some View {
    ZStack {
      FeymantecBackgroundView()

      VStack(spacing: 18) {
        header

        Spacer(minLength: 0)

        FeymantecGlassContainer(spacing: 18) {
          content
            .frame(maxWidth: 560)
        }

        Spacer(minLength: 0)
      }
      .padding(18)
      .animation(.spring(response: 0.45, dampingFraction: 0.90), value: step)
      .onChange(of: step) { _, next in
        if next != .explain {
          timerActive = false
        }
      }
      .onReceive(Timer.publish(every: 0.5, on: .main, in: .common).autoconnect()) { now in
        guard timerActive else { return }
        let dt = now.timeIntervalSince(lastTick)
        if dt >= 0.99 {
          lastTick = now
          remainingSeconds = max(0, remainingSeconds - 1)
          if remainingSeconds == 0 {
            timerActive = false
          }
        }
      }
    }
  }

  private var header: some View {
    HStack(alignment: .center, spacing: 12) {
      VStack(alignment: .leading, spacing: 2) {
        Text("Feymantec")
          .font(.system(size: 20, weight: .semibold, design: .rounded))
          .foregroundStyle(.white)

        Text("First principles, not flashcards")
          .font(.system(size: 12, weight: .medium, design: .rounded))
          .foregroundStyle(.white.opacity(0.70))
      }

      Spacer(minLength: 0)

      timerChip
    }
    .padding(.horizontal, 2)
  }

  @ViewBuilder
  private var timerChip: some View {
    if step == .explain {
      Text(timeString(remainingSeconds))
        .font(.system(size: 14, weight: .semibold, design: .rounded))
        .foregroundStyle(.white)
        .padding(.vertical, 10)
        .padding(.horizontal, 14)
        .fey_glassChip(interactive: false)
        .accessibilityLabel("Time remaining")
    }
  }

  @ViewBuilder
  private var content: some View {
    switch step {
    case .pick:
      pickStep
    case .explain:
      explainStep
    case .card:
      cardStep
    }
  }

  private var pickStep: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text("Learn any concept in 5 minutes")
        .font(.system(size: 28, weight: .bold, design: .rounded))
        .foregroundStyle(.white)
        .fixedSize(horizontal: false, vertical: true)

      Text("Pick a concept. Teach it simply. We’ll show the gaps.")
        .font(.system(size: 14, weight: .medium, design: .rounded))
        .foregroundStyle(.white.opacity(0.75))

      VStack(alignment: .leading, spacing: 10) {
        TextField("e.g. TCP congestion control", text: $concept)
          .textInputAutocapitalization(.sentences)
          .autocorrectionDisabled(false)
          .font(.system(size: 16, weight: .semibold, design: .rounded))
          .foregroundStyle(.white)
          .padding(.vertical, 14)
          .padding(.horizontal, 14)
          .fey_glassChip(interactive: true)

        if isBlocked {
          Text("That topic isn’t allowed. Try a different concept.")
            .font(.system(size: 12, weight: .semibold, design: .rounded))
            .foregroundStyle(Color(red: 1.0, green: 0.55, blue: 0.35))
        }
      }

      HStack(spacing: 12) {
        Button {
          concept = "TCP congestion control"
        } label: {
          Text("Try a prompt")
        }
        .fey_secondaryButtonStyle()

        Spacer(minLength: 0)

        Button {
          startExplain()
        } label: {
          Text("Start 5 min")
        }
        .disabled(concept.fey_safeTrim().isEmpty || isBlocked)
        .fey_primaryButtonStyle()
      }
    }
    .padding(18)
    .fey_glassCard(interactive: true)
    .fey_glassEffectID("step.pick", in: glassNamespace)
  }

  private var explainStep: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text(concept.fey_safeTrim().isEmpty ? "Teach it" : concept.fey_safeTrim())
        .font(.system(size: 22, weight: .bold, design: .rounded))
        .foregroundStyle(.white)

      Text("Explain like you’re teaching a smart 12-year-old. Use 1 example if you can.")
        .font(.system(size: 13, weight: .medium, design: .rounded))
        .foregroundStyle(.white.opacity(0.75))

      TextEditor(text: $explanation)
        .font(.system(size: 15, weight: .medium, design: .rounded))
        .foregroundStyle(.white)
        .scrollContentBackground(.hidden)
        .frame(minHeight: 220)
        .padding(14)
        .fey_glassCard(tint: .white.opacity(0.07), interactive: true)

      HStack(spacing: 12) {
        Button {
          step = .pick
        } label: {
          Text("Back")
        }
        .fey_secondaryButtonStyle()

        Spacer(minLength: 0)

        Button {
          step = .card
        } label: {
          Text("Make card")
        }
        .disabled(explanation.fey_safeTrim().isEmpty)
        .fey_primaryButtonStyle()
      }
    }
    .padding(18)
    .fey_glassCard(interactive: true)
    .fey_glassEffectID("step.explain", in: glassNamespace)
    .onAppear {
      if remainingSeconds <= 0 || remainingSeconds > 5 * 60 {
        remainingSeconds = 5 * 60
      }
      lastTick = .now
      timerActive = true
    }
  }

  private var cardStep: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 14) {
        PreviewCardView(card: card)

        HStack(spacing: 12) {
          Button {
            step = .explain
          } label: {
            Text("Edit")
          }
          .fey_secondaryButtonStyle()

          Spacer(minLength: 0)

          ShareLink(item: shareText(card)) {
            Text("Share")
          }
          .fey_primaryButtonStyle()
        }
      }
      .padding(18)
    }
    .scrollIndicators(.hidden)
    .fey_glassCard(interactive: true)
    .fey_glassEffectID("step.card", in: glassNamespace)
  }

  private func startExplain() {
    step = .explain
    remainingSeconds = 5 * 60
    explanation = ""
    lastTick = .now
    timerActive = true
  }

  private func timeString(_ seconds: Int) -> String {
    let m = seconds / 60
    let s = seconds % 60
    return String(format: "%d:%02d", m, s)
  }

  private func shareText(_ card: PreviewCard) -> String {
    var out: [String] = []
    out.append("Feymantec: \(card.concept)")
    out.append("Clarity score: \(card.score)")
    out.append("")
    out.append("Gaps:")
    out.append(contentsOf: card.gaps.map { "- \($0)" })
    out.append("")
    out.append("Analogy:")
    out.append(card.analogy)
    return out.joined(separator: "\n")
  }

}
