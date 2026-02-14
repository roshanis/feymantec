import Foundation

public enum PreviewCardBuilder {
  public static func extractJargonWords(_ v1: String, max: Int = 8) -> [String] {
    let words = v1.fey_safeTrim().split(separator: " ").map(String.init)
    var jargon: [String] = []
    var seen = Set<String>()

    for w in words {
      let clean = w.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
      if clean.isEmpty { continue }

      let isLong = clean.count >= 12
      let isAllCaps = clean.range(of: "^[A-Z]{2,}$", options: [.regularExpression]) != nil
      let hasMultipleCaps = clean.range(of: "[A-Z].*[A-Z]", options: [.regularExpression]) != nil

      if isLong || isAllCaps || hasMultipleCaps {
        if !seen.contains(clean) {
          jargon.append(clean)
          seen.insert(clean)
          if jargon.count >= max { break }
        }
      }
    }

    return jargon
  }

  public static func buildPreviewCard(concept: String, v1: String) -> PreviewCard {
    let wc = v1.fey_wordCount()
    let v1Trimmed = v1.fey_safeTrim()
    let lc = v1Trimmed.count

    let lower = v1.lowercased()
    let hasExample =
      lower.range(of: "\\b(for example|e\\.g\\.|like|such as|imagine|say)\\b", options: [.regularExpression]) != nil
      || lower.range(of: "\\d", options: [.regularExpression]) != nil

    let hasBecause =
      lower.range(of: "\\b(because|therefore|so that|which means|as a result)\\b", options: [.regularExpression]) != nil

    let vague =
      lower.range(of: "\\b(stuff|things|basically|just|somehow|kind of|sort of)\\b", options: [.regularExpression]) != nil

    let uniqJargon = extractJargonWords(v1, max: 8)

    // Score
    var score = 86
    score -= clamp(uniqJargon.count * 2, 0, 14)
    if !hasExample { score -= 8 }
    if !hasBecause { score -= 4 }
    if vague { score -= 5 }
    if wc < 25 { score -= 8 }
    if wc > 180 { score -= 6 }
    if lc < 60 { score -= 6 }
    score = clamp(score, 42, 96)

    // Gaps
    var gaps: [String] = []
    if let firstJargon = uniqJargon.first {
      gaps.append("Define \"\(firstJargon)\" in one sentence a 12-year-old would understand.")
    }
    if !hasExample {
      gaps.append("Give a concrete example of \(concept) with numbers or a real situation.")
    }
    if !hasBecause {
      gaps.append("Add the missing 'because': what causes what in \(concept), step-by-step?")
    }
    if vague {
      gaps.append("Replace vague words (stuff/things/basically/just) with a specific mechanism.")
    }
    while gaps.count < 3 {
      gaps.append("What is the smallest true statement you can make about \(concept)?")
    }
    let gapsOut = Array(gaps.prefix(4))

    // Simple version
    let sentences = splitSentences(v1)
    var simple: [String] = []
    simple.append("In plain terms: \(concept) works like this.")

    let userSentences = sentences.prefix(3)
    simple.append(contentsOf: userSentences)

    let nudges = [
      "If you can explain \(concept) with one example, you probably get it.",
      "Try saying this out loud in under 30 seconds.",
      "Strip any word a 12-year-old wouldn't know and re-read it.",
      "Ask: what would break if this weren't true?",
      "Now remove every sentence that doesn't help someone else understand \(concept).",
    ]

    var ni = 0
    while simple.count < 5 && ni < nudges.count {
      simple.append(nudges[ni])
      ni += 1
    }

    // Analogy
    let analogies = [
      "Think of \(concept) like a recipe: each ingredient (input) goes through a specific set of steps, and the dish (output) is only as good as how well you followed them.",
      "\(concept) is like a vending machine: you put something specific in, a process happens inside that you can describe, and a predictable result comes out.",
      "Imagine \(concept) as a relay race: each runner (step) only works if the handoff from the previous one was clean.",
      "\(concept) is like a map legend: once you know what each symbol means, the whole picture makes sense at a glance.",
      "Think of \(concept) like tuning a guitar string: small, precise adjustments lead to the right result; random turning leads nowhere.",
      "\(concept) works like a filter: raw input goes in, the process removes what doesn't belong, and what comes out is cleaner and more useful.",
    ]
    let analogy = analogies[hashPick(concept, analogies.count)]

    // Quiz
    let quiz: [PreviewCard.QuizItem] = [
      .init(
        q: "If you had to explain \(concept) to a 12-year-old in one sentence, what would you say?",
        a: "A single sentence that captures the core mechanism of \(concept) without jargon."
      ),
      .init(
        q: "What's one thing that would NOT happen if \(concept) didn't exist or didn't work?",
        a: "Name a specific real-world consequence that depends on \(concept)."
      ),
    ]

    return PreviewCard(
      concept: concept,
      v1: v1Trimmed,
      score: score,
      jargon: uniqJargon,
      gaps: gapsOut,
      simple: simple,
      analogy: analogy,
      quiz: quiz
    )
  }

  private static func clamp(_ n: Int, _ lo: Int, _ hi: Int) -> Int {
    return min(hi, max(lo, n))
  }

  private static func splitSentences(_ text: String) -> [String] {
    let t = text.fey_safeTrim()
    if t.isEmpty { return [] }

    var sentences: [String] = []
    var current = ""

    for ch in t {
      current.append(ch)
      if ch == "." || ch == "!" || ch == "?" {
        let s = current.fey_safeTrim()
        if s.count > 4 { sentences.append(s) }
        current = ""
      }
    }

    let tail = current.fey_safeTrim()
    if tail.count > 4 { sentences.append(tail) }

    return sentences
  }

  private static func hashPick(_ s: String, _ len: Int) -> Int {
    if len <= 0 { return 0 }

    var h: Int32 = 0
    for cu in s.utf16 {
      h = (h &<< 5) &- h &+ Int32(cu)
    }

    let mod = Int(h % Int32(len))
    return (mod + len) % len
  }
}
