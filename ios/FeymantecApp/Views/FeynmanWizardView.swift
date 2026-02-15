import SwiftUI
import Combine
import FeymantecCore

struct FeynmanWizardView: View {
  enum Step: Int {
    case pick
    case learn
    case explain
    case card
  }

  enum LearnState {
    case idle
    case loading
    case loaded(introText: String)
    case failed(message: String)

    var isLoading: Bool {
      if case .loading = self { return true }
      return false
    }
  }

  @State private var step: Step = .pick
  @State private var concept: String = ""
  @State private var explanation: String = ""
  @State private var remainingSeconds: Int = 5 * 60
  @State private var timerActive: Bool = false
  @State private var lastTick: Date = .now
  @State private var learnState: LearnState = .idle
  @State private var introCache: [String: String] = [:]
  @State private var critiqueState: LearnState = .idle
  @State private var critiqueText: String = ""
  @State private var critiqueSuggestions: [String] = []
  @State private var critiqueScore: Int? = nil
  @State private var feynmanState: LearnState = .idle
  @State private var feynmanText: String = ""

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

      if step == .card {
        VStack(spacing: 0) {
          header
            .padding(.horizontal, 18)
            .padding(.top, 18)
            .padding(.bottom, 10)

          cardStep
            .frame(maxWidth: 560)
            .padding(.horizontal, 18)
            .padding(.bottom, 18)
        }
      } else {
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
      }
    }
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
    case .learn:
      learnStep
    case .explain:
      explainStep
    case .card:
      EmptyView()
    }
  }

  private var pickStep: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text("Learn any concept in 5 minutes")
        .font(.system(size: 28, weight: .bold, design: .rounded))
        .foregroundStyle(.white)
        .fixedSize(horizontal: false, vertical: true)

      Text("Pick a concept. Teach it simply. We'll show the gaps.")
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
          Text("That topic isn't allowed. Try a different concept.")
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

      Button {
        startLearn()
      } label: {
        Text("I don't know this yet")
          .frame(maxWidth: .infinity)
      }
      .disabled(concept.fey_safeTrim().isEmpty || isBlocked)
      .fey_secondaryButtonStyle()
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

      Text("Explain like you're teaching a smart 12-year-old. Use 1 example if you can.")
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
          critiqueState = .idle
          critiqueText = ""
          critiqueSuggestions = []
          critiqueScore = nil
          feynmanState = .idle
          feynmanText = ""
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
      VStack(alignment: .leading, spacing: 16) {
        HStack(alignment: .firstTextBaseline) {
          Text(concept.fey_safeTrim())
            .font(.system(size: 22, weight: .bold, design: .rounded))
            .foregroundStyle(.white)

          Spacer(minLength: 0)

          if let score = critiqueScore {
            Text("\(score)")
              .font(.system(size: 15, weight: .bold, design: .rounded))
              .foregroundStyle(.white)
              .padding(.vertical, 8)
              .padding(.horizontal, 12)
              .background(.white.opacity(0.15), in: Capsule())
              .accessibilityLabel("AI score")
          }
        }

        aiFeedbackSection

        feynmanSection

        HStack(spacing: 12) {
          Button {
            step = .pick
          } label: {
            Text("Start over")
          }
          .fey_secondaryButtonStyle()

          Button {
            step = .explain
          } label: {
            Text("Edit")
          }
          .fey_secondaryButtonStyle()

          Spacer(minLength: 0)

          Button {
            fetchFeynman()
          } label: {
            Text("Feynman")
          }
          .disabled(feynmanState.isLoading)
          .fey_primaryButtonStyle()
        }
      }
      .padding(20)
    }
    .scrollIndicators(.hidden)
    .background(Color(white: 0.10).opacity(0.92), in: RoundedRectangle(cornerRadius: FeymantecGlass.cardRadius, style: .continuous))
    .clipShape(RoundedRectangle(cornerRadius: FeymantecGlass.cardRadius, style: .continuous))
    .onAppear {
      if case .idle = critiqueState {
        fetchCritique()
      }
    }
  }

  @ViewBuilder
  private var aiFeedbackSection: some View {
    switch critiqueState {
    case .idle, .loading:
      HStack(spacing: 10) {
        ProgressView()
          .tint(.white)
        Text("Getting AI feedback…")
          .font(.system(size: 15, weight: .medium, design: .rounded))
          .foregroundStyle(.white.opacity(0.7))
      }
      .frame(maxWidth: .infinity, minHeight: 80)

    case .loaded:
      VStack(alignment: .leading, spacing: 14) {
        if !critiqueText.isEmpty {
          Text(critiqueText)
            .font(.system(size: 15, weight: .regular, design: .rounded))
            .foregroundStyle(.white.opacity(0.95))
            .fixedSize(horizontal: false, vertical: true)
            .lineSpacing(3)
        }

        if !critiqueSuggestions.isEmpty {
          VStack(alignment: .leading, spacing: 8) {
            Text("Try next")
              .font(.system(size: 14, weight: .bold, design: .rounded))
              .foregroundStyle(.white.opacity(0.6))
              .textCase(.uppercase)

            ForEach(critiqueSuggestions, id: \.self) { suggestion in
              HStack(alignment: .top, spacing: 8) {
                Circle()
                  .fill(.white.opacity(0.4))
                  .frame(width: 6, height: 6)
                  .padding(.top, 6)
                Text(suggestion)
                  .font(.system(size: 14, weight: .medium, design: .rounded))
                  .foregroundStyle(.white.opacity(0.9))
                  .fixedSize(horizontal: false, vertical: true)
                  .lineSpacing(2)
              }
            }
          }
          .padding(14)
          .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
      }

    case .failed(let message):
      VStack(spacing: 10) {
        Text(message)
          .font(.system(size: 14, weight: .medium, design: .rounded))
          .foregroundStyle(Color(red: 1.0, green: 0.55, blue: 0.35))
          .fixedSize(horizontal: false, vertical: true)

        Button {
          fetchCritique()
        } label: {
          Text("Retry")
        }
        .fey_secondaryButtonStyle()
      }
    }
  }

  @ViewBuilder
  private var feynmanSection: some View {
    switch feynmanState {
    case .idle:
      EmptyView()

    case .loading:
      HStack(spacing: 10) {
        ProgressView()
          .tint(.white)
        Text("Feynman is thinking…")
          .font(.system(size: 15, weight: .medium, design: .rounded))
          .foregroundStyle(.white.opacity(0.7))
      }
      .frame(maxWidth: .infinity, minHeight: 60)

    case .loaded:
      VStack(alignment: .leading, spacing: 10) {
        Text("Feynman Explanation")
          .font(.system(size: 14, weight: .bold, design: .rounded))
          .foregroundStyle(.white.opacity(0.6))
          .textCase(.uppercase)

        Text(feynmanText)
          .font(.system(size: 15, weight: .regular, design: .rounded))
          .foregroundStyle(.white.opacity(0.95))
          .fixedSize(horizontal: false, vertical: true)
          .lineSpacing(3)
      }
      .padding(14)
      .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))

    case .failed(let message):
      VStack(spacing: 10) {
        Text(message)
          .font(.system(size: 14, weight: .medium, design: .rounded))
          .foregroundStyle(Color(red: 1.0, green: 0.55, blue: 0.35))
          .fixedSize(horizontal: false, vertical: true)

        Button {
          fetchFeynman()
        } label: {
          Text("Retry")
        }
        .fey_secondaryButtonStyle()
      }
    }
  }

  private var learnStep: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text("Quick intro: \(concept.fey_safeTrim())")
        .font(.system(size: 22, weight: .bold, design: .rounded))
        .foregroundStyle(.white)
        .fixedSize(horizontal: false, vertical: true)

      Text("Read this brief intro, then try teaching it back.")
        .font(.system(size: 13, weight: .medium, design: .rounded))
        .foregroundStyle(.white.opacity(0.75))

      Group {
        switch learnState {
        case .idle, .loading:
          HStack {
            Spacer()
            ProgressView()
              .tint(.white)
            Spacer()
          }
          .frame(minHeight: 120)

        case .loaded(let introText):
          ScrollView {
            Text(introText)
              .font(.system(size: 15, weight: .medium, design: .rounded))
              .foregroundStyle(.white.opacity(0.9))
              .fixedSize(horizontal: false, vertical: true)
          }
          .frame(maxHeight: 260)

        case .failed(let message):
          VStack(spacing: 10) {
            Text(message)
              .font(.system(size: 13, weight: .medium, design: .rounded))
              .foregroundStyle(Color(red: 1.0, green: 0.55, blue: 0.35))
              .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 12) {
              Button {
                fetchIntro()
              } label: {
                Text("Retry")
              }
              .fey_secondaryButtonStyle()

              Button {
                startExplain()
              } label: {
                Text("Skip, try anyway")
              }
              .fey_secondaryButtonStyle()
            }
          }
          .frame(minHeight: 80)
        }
      }
      .padding(14)
      .fey_glassCard(tint: .white.opacity(0.07), interactive: false)

      HStack(spacing: 12) {
        Button {
          step = .pick
        } label: {
          Text("Back")
        }
        .fey_secondaryButtonStyle()

        Spacer(minLength: 0)

        if case .loaded = learnState {
          Button {
            startExplain()
          } label: {
            Text("I'm ready to teach")
          }
          .fey_primaryButtonStyle()
        }
      }
    }
    .padding(18)
    .fey_glassCard(interactive: true)
    .fey_glassEffectID("step.learn", in: glassNamespace)
  }

  private func startLearn() {
    step = .learn
    let key = concept.fey_safeTrim().lowercased()
    if let cached = introCache[key] {
      learnState = .loaded(introText: cached)
    } else {
      fetchIntro()
    }
  }

  private func fetchIntro() {
    learnState = .loading
    let topicText = concept.fey_safeTrim()
    Task {
      do {
        let request = AIExplainRequest(
          inputText: topicText,
          topic: topicText,
          mode: "intro"
        )
        let response = try await FeymantecAPIClient.shared.callAIExplain(request)
        let text = response.resultText
        introCache[topicText.lowercased()] = text
        learnState = .loaded(introText: text)
      } catch {
        learnState = .failed(message: "Couldn't load intro. Check your connection and try again.")
      }
    }
  }

  private func fetchCritique() {
    critiqueState = .loading
    let topicText = concept.fey_safeTrim()
    let explanationText = explanation.fey_safeTrim()
    Task {
      do {
        let request = AIExplainRequest(
          inputText: explanationText,
          topic: topicText,
          mode: "critique"
        )
        let response = try await FeymantecAPIClient.shared.callAIExplain(request)
        critiqueText = response.resultText
        critiqueSuggestions = response.suggestions
        critiqueScore = response.score
        critiqueState = .loaded(introText: "")
      } catch {
        critiqueState = .failed(message: "Couldn't get AI feedback. Check your connection and try again.")
      }
    }
  }

  private func fetchFeynman() {
    feynmanState = .loading
    let topicText = concept.fey_safeTrim()
    let explanationText = explanation.fey_safeTrim()
    Task {
      do {
        let request = AIExplainRequest(
          inputText: explanationText,
          topic: topicText,
          mode: "feynman"
        )
        let response = try await FeymantecAPIClient.shared.callAIExplain(request)
        feynmanText = response.resultText
        feynmanState = .loaded(introText: "")
      } catch {
        feynmanState = .failed(message: "Couldn't load explanation. Check your connection and try again.")
      }
    }
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
