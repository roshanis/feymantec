import SwiftUI
import UIKit
import Combine
import FeymantecCore

struct FeynmanWizardView: View {
  enum FocusField: Hashable {
    case concept
    case explanation
  }

  enum Step {
    case pick
    case learn
    case explain
    case card
  }

  enum AsyncState<T> {
    case idle
    case loading
    case loaded(T)
    case failed(message: String)

    var isLoading: Bool {
      if case .loading = self { return true }
      return false
    }
  }

  struct CritiqueResult {
    var text: String = ""
    var suggestions: [String] = []
    var score: Int? = nil
  }

  @State private var step: Step = .pick
  @State private var concept: String = ""
  @State private var explanation: String = ""
  @State private var remainingSeconds: Int = 5 * 60
  @State private var timerActive: Bool = false
  @State private var lastTick: Date = .now
  @State private var learnState: AsyncState<String> = .idle
  // Intro cache is intentionally in-memory only. Resetting on navigation is acceptable
  // since the AI call is cheap and the user may change topics frequently.
  @State private var introCache: [String: String] = [:]
  @State private var critique = CritiqueResult()
  @State private var critiqueState: AsyncState<Void> = .idle
  @State private var feynmanText: String = ""
  @State private var feynmanState: AsyncState<Void> = .idle
  @State private var introTask: Task<Void, Never>? = nil
  @State private var critiqueTask: Task<Void, Never>? = nil
  @State private var feynmanTask: Task<Void, Never>? = nil
  @State private var introToken: Int = 0
  @State private var critiqueToken: Int = 0
  @State private var feynmanToken: Int = 0

  @Environment(\.scenePhase) private var scenePhase
  @Namespace private var glassNamespace
  @FocusState private var focusedField: FocusField?

  private var isBlocked: Bool {
    TopicPolicy.isLikelyNSFW(concept)
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

          GeometryReader { proxy in
            VStack(spacing: 0) {
              cardStep
                .frame(maxWidth: 560)
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 18)
            // Give the ScrollView a concrete height so it can scroll.
            .frame(width: proxy.size.width, height: proxy.size.height, alignment: .top)
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
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
    .onChange(of: step) { next in
      if next != .explain {
        timerActive = false
      }
      if next != .learn {
        introToken += 1
        introTask?.cancel()
        introTask = nil
      }
      if next != .card {
        critiqueToken += 1
        feynmanToken += 1
        critiqueTask?.cancel()
        critiqueTask = nil
        feynmanTask?.cancel()
        feynmanTask = nil
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
    .onChange(of: scenePhase) { newPhase in
      if newPhase == .active && timerActive {
        lastTick = .now
      }
    }
    .toolbar {
      ToolbarItemGroup(placement: .keyboard) {
        Spacer()
        Button("Done") {
          focusedField = nil
        }
      }
    }
  }

  private var header: some View {
    HStack(alignment: .center, spacing: 12) {
      VStack(alignment: .leading, spacing: 2) {
        Text("Feymantec")
          .font(.system(.title3, design: .rounded).weight(.semibold))
          .foregroundStyle(.white)

        Text("First principles, not flashcards")
          .font(.system(.caption, design: .rounded).weight(.medium))
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
        .font(.system(.callout, design: .rounded).weight(.semibold))
        .monospacedDigit()
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
        .font(.system(.title, design: .rounded).weight(.bold))
        .foregroundStyle(.white)
        .fixedSize(horizontal: false, vertical: true)

      Text("Pick a concept. Teach it simply. We’ll show the gaps.")
        .font(.system(.callout, design: .rounded).weight(.medium))
        .foregroundStyle(.white.opacity(0.75))

      VStack(alignment: .leading, spacing: 10) {
        TextField("e.g. TCP congestion control", text: $concept)
          .textInputAutocapitalization(.sentences)
          .autocorrectionDisabled(true)
          .submitLabel(.go)
          .focused($focusedField, equals: .concept)
          .onSubmit {
            if !concept.fey_safeTrim().isEmpty && !isBlocked {
              startExplain()
            }
          }
          .font(.system(.body, design: .rounded).weight(.semibold))
          .foregroundStyle(.white)
          .padding(.vertical, 14)
          .padding(.horizontal, 14)
          .fey_glassChip(interactive: true)

        if isBlocked {
          Text("That topic isn’t allowed. Try a different concept.")
            .font(.system(.caption, design: .rounded).weight(.semibold))
            .foregroundStyle(Color(red: 1.0, green: 0.55, blue: 0.35))
        }
      }

      HStack(spacing: 12) {
        Button {
          concept = DailyPrompts.today
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
    // Note: `.interactive(true)` on glass surfaces can interfere with inner scroll views
    // and text input on the iOS simulator. Keep the large surface non-interactive.
    .fey_glassCard(interactive: false)
    .fey_glassEffectID("step.pick", in: glassNamespace)
  }

  private var explainStep: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text(concept.fey_safeTrim().isEmpty ? "Teach it" : concept.fey_safeTrim())
        .font(.system(.title2, design: .rounded).weight(.bold))
        .foregroundStyle(.white)

      Text("Explain like you’re teaching a smart 12-year-old. Use 1 example if you can.")
        .font(.system(.callout, design: .rounded).weight(.medium))
        .foregroundStyle(.white.opacity(0.75))

      ZStack(alignment: .topLeading) {
        if explanation.fey_safeTrim().isEmpty {
          Text("Start from the simplest true statement, then build.")
            .font(.system(.body, design: .rounded).weight(.medium))
            .foregroundStyle(.white.opacity(0.45))
            .padding(.horizontal, 18)
            .padding(.vertical, 22)
            .allowsHitTesting(false)
        }

        TextEditor(text: $explanation)
          .font(.system(.body, design: .rounded).weight(.medium))
          .foregroundStyle(.white)
          .scrollContentBackground(.hidden)
          .textInputAutocapitalization(.sentences)
          .autocorrectionDisabled(false)
          .focused($focusedField, equals: .explanation)
          .frame(minHeight: 220)
          .padding(14)
      }
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
          critique = CritiqueResult()
          critiqueState = .idle
          feynmanText = ""
          feynmanState = .idle
          step = .card
        } label: {
          Text("Make card")
        }
        .disabled(explanation.fey_safeTrim().isEmpty)
        .fey_primaryButtonStyle()
      }
    }
    .padding(18)
    .fey_glassCard(interactive: false)
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
            .font(.system(.title2, design: .rounded).weight(.bold))
            .foregroundStyle(.white)

          Spacer(minLength: 0)

          if let score = critique.score {
            Text("\(score)")
              .font(.system(.callout, design: .rounded).weight(.bold))
              .foregroundStyle(.white)
              .padding(.vertical, 8)
              .padding(.horizontal, 12)
              .background(.white.opacity(0.15), in: Capsule())
              .accessibilityLabel("AI score")
          }
        }

        localCardSection

        aiFeedbackSection

        feynmanSection

        HStack(spacing: 12) {
          Menu {
            Button("Edit") {
              step = .explain
            }
            ShareLink(item: shareText()) {
              Text("Share")
            }
            Divider()
            Button("Start over", role: .destructive) {
              step = .pick
            }
          } label: {
            Text("More")
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

  private var localCardSection: some View {
    let card = PreviewCardBuilder.buildPreviewCard(concept: concept.fey_safeTrim(), v1: explanation)

    return VStack(alignment: .leading, spacing: 12) {
      HStack(alignment: .firstTextBaseline) {
        Text("Instant card")
          .font(.system(.caption, design: .rounded).weight(.bold))
          .foregroundStyle(.white.opacity(0.6))
          .textCase(.uppercase)

        Spacer(minLength: 0)

        Text("Local \(card.score)")
          .font(.system(.caption, design: .rounded).weight(.bold))
          .foregroundStyle(.white.opacity(0.9))
          .padding(.vertical, 7)
          .padding(.horizontal, 10)
          .background(.white.opacity(0.12), in: Capsule())
          .accessibilityLabel("Local score")
      }

      if !card.gaps.isEmpty {
        VStack(alignment: .leading, spacing: 8) {
          Text("Gaps")
            .font(.system(.caption, design: .rounded).weight(.bold))
            .foregroundStyle(.white.opacity(0.8))

          ForEach(card.gaps, id: \.self) { gap in
            HStack(alignment: .top, spacing: 8) {
              Circle()
                .fill(.white.opacity(0.4))
                  .frame(width: 6, height: 6)
                  .padding(.top, 6)
              Text(gap)
                .font(.system(.callout, design: .rounded).weight(.medium))
                .foregroundStyle(.white.opacity(0.9))
                .fixedSize(horizontal: false, vertical: true)
                .lineSpacing(2)
            }
          }
        }
      }

      if !card.analogy.isEmpty {
        VStack(alignment: .leading, spacing: 6) {
          Text("Analogy")
            .font(.system(.caption, design: .rounded).weight(.bold))
            .foregroundStyle(.white.opacity(0.8))
          Text(card.analogy)
            .font(.system(.callout, design: .rounded))
            .foregroundStyle(.white.opacity(0.9))
            .fixedSize(horizontal: false, vertical: true)
            .lineSpacing(2)
        }
      }

      if !card.quiz.isEmpty {
        VStack(alignment: .leading, spacing: 8) {
          Text("Quick check")
            .font(.system(.caption, design: .rounded).weight(.bold))
            .foregroundStyle(.white.opacity(0.8))

          ForEach(card.quiz, id: \.q) { item in
            Text("Q: \(item.q)")
              .font(.system(.callout, design: .rounded).weight(.medium))
              .foregroundStyle(.white.opacity(0.9))
              .fixedSize(horizontal: false, vertical: true)
          }
        }
      }
    }
    .padding(14)
    .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
  }

  @ViewBuilder
  private var aiFeedbackSection: some View {
    switch critiqueState {
    case .idle, .loading:
      HStack(spacing: 10) {
        ProgressView()
          .tint(.white)
          .accessibilityLabel("Loading AI feedback")
        Text("Getting AI feedback…")
          .font(.system(.callout, design: .rounded).weight(.medium))
          .foregroundStyle(.white.opacity(0.7))
      }
      .frame(maxWidth: .infinity, minHeight: 80)

    case .loaded:
      VStack(alignment: .leading, spacing: 14) {
        if !critique.text.isEmpty {
          Text(critique.text)
            .font(.system(.body, design: .rounded))
            .foregroundStyle(.white.opacity(0.95))
            .fixedSize(horizontal: false, vertical: true)
            .lineSpacing(3)
        }

        if !critique.suggestions.isEmpty {
          VStack(alignment: .leading, spacing: 8) {
            Text("Try next")
              .font(.system(.caption, design: .rounded).weight(.bold))
              .foregroundStyle(.white.opacity(0.6))
              .textCase(.uppercase)

            ForEach(critique.suggestions, id: \.self) { suggestion in
              HStack(alignment: .top, spacing: 8) {
                Circle()
                  .fill(.white.opacity(0.4))
                  .frame(width: 6, height: 6)
                  .padding(.top, 6)
                Text(suggestion)
                  .font(.system(.callout, design: .rounded).weight(.medium))
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
          .font(.system(.callout, design: .rounded).weight(.medium))
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
          .accessibilityLabel("Loading Feynman explanation")
        Text("Feynman is thinking…")
          .font(.system(.callout, design: .rounded).weight(.medium))
          .foregroundStyle(.white.opacity(0.7))
      }
      .frame(maxWidth: .infinity, minHeight: 60)

    case .loaded:
      VStack(alignment: .leading, spacing: 10) {
        Text("Feynman Explanation")
          .font(.system(.caption, design: .rounded).weight(.bold))
          .foregroundStyle(.white.opacity(0.6))
          .textCase(.uppercase)

        Text(feynmanText)
          .font(.system(.body, design: .rounded))
          .foregroundStyle(.white.opacity(0.95))
          .fixedSize(horizontal: false, vertical: true)
          .lineSpacing(3)
      }
      .padding(14)
      .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))

    case .failed(let message):
      VStack(spacing: 10) {
        Text(message)
          .font(.system(.callout, design: .rounded).weight(.medium))
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
        .font(.system(.title2, design: .rounded).weight(.bold))
        .foregroundStyle(.white)
        .fixedSize(horizontal: false, vertical: true)

      Text("Read this brief intro, then try teaching it back.")
        .font(.system(.callout, design: .rounded).weight(.medium))
        .foregroundStyle(.white.opacity(0.75))

      Group {
        switch learnState {
        case .idle, .loading:
          HStack {
            Spacer()
            ProgressView()
              .tint(.white)
              .accessibilityLabel("Loading introduction")
            Spacer()
          }
          .frame(minHeight: 120)

        case .loaded(let text):
          ScrollView {
            Text(text)
              .font(.system(.body, design: .rounded).weight(.medium))
              .foregroundStyle(.white.opacity(0.9))
              .fixedSize(horizontal: false, vertical: true)
          }
          .frame(maxHeight: 260)

        case .failed(let message):
          VStack(spacing: 10) {
            Text(message)
              .font(.system(.callout, design: .rounded).weight(.medium))
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
    .fey_glassCard(interactive: false)
    .fey_glassEffectID("step.learn", in: glassNamespace)
  }

  private func haptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
    UIImpactFeedbackGenerator(style: style).impactOccurred()
  }

  private func startLearn() {
    haptic()
    step = .learn
    let key = concept.fey_safeTrim().lowercased()
    if let cached = introCache[key] {
      learnState = .loaded(cached)
    } else {
      fetchIntro()
    }
  }

  private func userFacingMessage(for error: any Error) -> String {
    if let cfgError = error as? FeymantecConfigError {
      switch cfgError {
      case .missingKey:
        return "App configuration missing. Please reinstall or update."
      case .invalidURL, .invalidAnonKey:
        return "App configuration invalid. Please reinstall or update."
      }
    }
    if let urlError = error as? URLError {
      switch urlError.code {
      case .timedOut:
        return "Request timed out. Try again."
      case .notConnectedToInternet:
        return "No internet connection."
      case .badServerResponse:
        return "Server error. Please try again later."
      default:
        break
      }
    }
    if error is DecodingError {
      return "Unexpected response format."
    }
    return "Something went wrong. Try again."
  }

  private func fetchIntro() {
    introToken += 1
    let token = introToken
    introTask?.cancel()
    learnState = .loading
    let topicText = concept.fey_safeTrim()
    introTask = Task {
      do {
        let request = AIExplainRequest(
          inputText: topicText,
          topic: topicText,
          mode: "intro"
        )
        let response = try await FeymantecAPIClient.shared.callAIExplain(request)
        try Task.checkCancellation()
        if token != introToken { return }
        let text = response.resultText
        introCache[topicText.lowercased()] = text
        learnState = .loaded(text)
      } catch {
        if error is CancellationError { return }
        if token != introToken { return }
        learnState = .failed(message: userFacingMessage(for: error))
      }
    }
  }

  private func fetchCritique() {
    critiqueToken += 1
    let token = critiqueToken
    critiqueTask?.cancel()
    critiqueState = .loading
    let topicText = concept.fey_safeTrim()
    let explanationText = explanation.fey_safeTrim()
    critiqueTask = Task {
      do {
        let request = AIExplainRequest(
          inputText: explanationText,
          topic: topicText,
          mode: "critique"
        )
        let response = try await FeymantecAPIClient.shared.callAIExplain(request)
        try Task.checkCancellation()
        if token != critiqueToken { return }
        critique = CritiqueResult(
          text: response.resultText,
          suggestions: response.suggestions,
          score: response.score
        )
        critiqueState = .loaded(())
        haptic(.light)
      } catch {
        if error is CancellationError { return }
        if token != critiqueToken { return }
        critiqueState = .failed(message: userFacingMessage(for: error))
      }
    }
  }

  private func fetchFeynman() {
    feynmanToken += 1
    let token = feynmanToken
    feynmanTask?.cancel()
    feynmanState = .loading
    let topicText = concept.fey_safeTrim()
    let explanationText = explanation.fey_safeTrim()
    let conversation: [AIExplainRequest.ConversationTurn] = [
      .init(role: "user", content: explanationText),
      .init(role: "assistant", content: critique.text),
    ]
    feynmanTask = Task {
      do {
        let request = AIExplainRequest(
          inputText: explanationText,
          topic: topicText,
          mode: "feynman",
          conversation: conversation
        )
        let response = try await FeymantecAPIClient.shared.callAIExplain(request)
        try Task.checkCancellation()
        if token != feynmanToken { return }
        feynmanText = response.resultText
        feynmanState = .loaded(())
        haptic(.light)
      } catch {
        if error is CancellationError { return }
        if token != feynmanToken { return }
        feynmanState = .failed(message: userFacingMessage(for: error))
      }
    }
  }

  private func startExplain() {
    haptic()
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

  private func shareText() -> String {
    var out: [String] = []
    out.append("Feymantec: \(concept.fey_safeTrim())")
    if let score = critique.score {
      out.append("Clarity score: \(score)")
    }
    if !critique.text.isEmpty {
      out.append("")
      out.append(critique.text)
    }
    if !critique.suggestions.isEmpty {
      out.append("")
      out.append("Try next:")
      out.append(contentsOf: critique.suggestions.map { "- \($0)" })
    }
    if !feynmanText.isEmpty {
      out.append("")
      out.append("Feynman explanation:")
      out.append(feynmanText)
    }
    return out.joined(separator: "\n")
  }

}
