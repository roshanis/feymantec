import Foundation
import FeymantecCore

private struct TestFailure: Error {
  let message: String
}

private func expect(_ condition: @autoclosure () -> Bool, _ message: String) throws {
  if !condition() {
    throw TestFailure(message: message)
  }
}

private func run(_ name: String, _ test: () throws -> Void) -> Bool {
  do {
    try test()
    print("PASS: \(name)")
    return true
  } catch let err as TestFailure {
    print("FAIL: \(name)\n  \(err.message)")
    return false
  } catch {
    print("FAIL: \(name)\n  \(error)")
    return false
  }
}

var failures = 0

failures += run("safeTrim_collapsesWhitespaceAndTrims") {
  try expect("  hello   world\n\t".fey_safeTrim() == "hello world", "expected safeTrim to collapse whitespace")
} ? 0 : 1

failures += run("wordCount_countsWordsAfterSafeTrim") {
  try expect("   ".fey_wordCount() == 0, "expected wordCount to be 0 for whitespace")
  try expect("hello   world".fey_wordCount() == 2, "expected wordCount to count words after collapsing spaces")
} ? 0 : 1

failures += run("isLikelyNSFW_blocksCommonTerms") {
  try expect(TopicPolicy.isLikelyNSFW("porn"), "expected NSFW term to be blocked")
  try expect(TopicPolicy.isLikelyNSFW("Hardcore"), "expected NSFW term to be blocked (case-insensitive)")
  try expect(TopicPolicy.isLikelyNSFW("onlyfans"), "expected NSFW term to be blocked")
} ? 0 : 1

failures += run("isLikelyNSFW_allowsNormalTopics") {
  try expect(!TopicPolicy.isLikelyNSFW("Photosynthesis"), "expected safe topic to pass")
  try expect(!TopicPolicy.isLikelyNSFW("TCP congestion control"), "expected safe topic to pass")
} ? 0 : 1

failures += run("extractJargonWords_findsLongAllCapsAndCamelCase") {
  let text = "We use backpropagation with HTTP and SomeCamelCaseThing."
  let jargon = PreviewCardBuilder.extractJargonWords(text, max: 8)

  try expect(jargon.contains("backpropagation"), "expected long word to be considered jargon")
  try expect(jargon.contains("HTTP"), "expected ALLCAPS word to be considered jargon")
  try expect(jargon.contains("SomeCamelCaseThing"), "expected CamelCase word to be considered jargon")
} ? 0 : 1

failures += run("buildPreviewCard_scoresAndOutputsExpectedStructure") {
  let concept = "Neural networks"
  let v1 = "Neural networks are basically models that use backpropagation because they adjust weights."

  let card = PreviewCardBuilder.buildPreviewCard(concept: concept, v1: v1)

  try expect(card.concept == concept, "expected concept to roundtrip")
  try expect(card.v1 == v1, "expected v1 to be safeTrimmed but unchanged here")
  try expect(card.score == 63, "expected deterministic score for fixture")

  try expect(card.jargon == ["backpropagation"], "expected jargon extraction to match")

  try expect(card.gaps.count == 3, "expected 3 gaps")
  try expect(card.gaps[0] == "Define \"backpropagation\" in one sentence a 12-year-old would understand.", "expected jargon definition gap")
  try expect(card.gaps[1] == "Give a concrete example of Neural networks with numbers or a real situation.", "expected example gap")
  try expect(card.gaps[2] == "Replace vague words (stuff/things/basically/just) with a specific mechanism.", "expected vague-words gap")

  try expect(card.simple.count == 5, "expected simple list to be padded to 5")
  try expect(card.simple[0] == "In plain terms: Neural networks works like this.", "expected simple intro")
  try expect(card.simple[1] == v1, "expected first user sentence to be included")

  try expect(!card.analogy.isEmpty, "expected analogy")
  try expect(card.analogy.contains(concept), "expected analogy to include concept")

  try expect(card.quiz.count == 2, "expected 2 quiz items")
  try expect(card.quiz[0].q.contains(concept), "expected quiz question to include concept")
} ? 0 : 1

failures += run("smoke_buildPreviewCard_doesNotCrashOnEmptyStrings") {
  let card = PreviewCardBuilder.buildPreviewCard(concept: "", v1: "")

  try expect(card.concept == "", "expected empty concept")
  try expect(card.v1 == "", "expected empty v1")
  try expect(card.gaps.count == 3, "expected minimum gaps")
  try expect(card.simple.count == 5, "expected padded simple")
} ? 0 : 1

if failures > 0 {
  print("\n\(failures) test(s) failed")
  exit(1)
}

print("\nAll tests passed")
