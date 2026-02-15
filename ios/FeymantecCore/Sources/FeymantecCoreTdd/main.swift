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

failures += run("AIExplainRequest_encodesCorrectly") {
  let req = AIExplainRequest(
    inputText: "Photosynthesis converts light",
    topic: "Photosynthesis",
    mode: "intro",
    conversation: [
      AIExplainRequest.ConversationTurn(role: "user", content: "hello")
    ]
  )
  let data = try JSONEncoder().encode(req)
  let dict = try JSONSerialization.jsonObject(with: data) as! [String: Any]

  try expect(dict["inputText"] as? String == "Photosynthesis converts light", "expected inputText")
  try expect(dict["topic"] as? String == "Photosynthesis", "expected topic")
  try expect(dict["mode"] as? String == "intro", "expected mode")

  let conv = dict["conversation"] as? [[String: Any]] ?? []
  try expect(conv.count == 1, "expected 1 conversation turn")
  try expect(conv[0]["role"] as? String == "user", "expected role")
  try expect(conv[0]["content"] as? String == "hello", "expected content")
} ? 0 : 1

failures += run("AIExplainResponse_decodesFromServerJSON") {
  let json = """
  {
    "resultText": "Here is an intro.",
    "suggestions": ["Try an example", "Add a diagram"],
    "score": 42,
    "model": "gpt-5.2"
  }
  """.data(using: .utf8)!

  let resp = try JSONDecoder().decode(AIExplainResponse.self, from: json)
  try expect(resp.resultText == "Here is an intro.", "expected resultText")
  try expect(resp.suggestions == ["Try an example", "Add a diagram"], "expected suggestions")
  try expect(resp.score == 42, "expected score")
  try expect(resp.model == "gpt-5.2", "expected model")
} ? 0 : 1

failures += run("AIExplainResponse_decodesWithNullScore") {
  let json = """
  {
    "resultText": "No score here.",
    "suggestions": [],
    "score": null,
    "model": null
  }
  """.data(using: .utf8)!

  let resp = try JSONDecoder().decode(AIExplainResponse.self, from: json)
  try expect(resp.resultText == "No score here.", "expected resultText")
  try expect(resp.suggestions.isEmpty, "expected empty suggestions")
  try expect(resp.score == nil, "expected nil score")
  try expect(resp.model == nil, "expected nil model")
} ? 0 : 1

failures += run("DailyPrompts_allIsNotEmpty") {
  try expect(!DailyPrompts.all.isEmpty, "expected daily prompts list to be non-empty")
  try expect(DailyPrompts.all.count == 15, "expected 15 daily prompts")
} ? 0 : 1

failures += run("DailyPrompts_todayReturnsValidPrompt") {
  let prompt = DailyPrompts.today
  try expect(!prompt.isEmpty, "expected today's prompt to be non-empty")
  try expect(DailyPrompts.all.contains(prompt), "expected today's prompt to be in the list")
} ? 0 : 1

failures += run("FeymantecBackendConfig_fromInfoDictionary_parsesValues") {
  let info: [String: Any] = [
    "FEYMANTEC_SUPABASE_FUNCTIONS_BASE_URL": "https://example.supabase.co/functions/v1",
    "FEYMANTEC_SUPABASE_ANON_KEY": "sb_publishable_test_123",
  ]

  let cfg = try FeymantecBackendConfig.fromInfoDictionary(info)
  try expect(
    cfg.functionsBaseURL.absoluteString == "https://example.supabase.co/functions/v1",
    "expected functions base url to parse"
  )
  try expect(cfg.anonKey == "sb_publishable_test_123", "expected anon key to parse")
} ? 0 : 1

failures += run("FeymantecBackendConfig_fromInfoDictionary_missingKeysThrows") {
  let info: [String: Any] = [:]
  do {
    _ = try FeymantecBackendConfig.fromInfoDictionary(info)
    throw TestFailure(message: "expected missing keys to throw")
  } catch is FeymantecConfigError {
    // ok
  }
} ? 0 : 1

failures += run("FeymantecBackendConfig_fromInfoDictionary_invalidURLThrows") {
  let info: [String: Any] = [
    "FEYMANTEC_SUPABASE_FUNCTIONS_BASE_URL": "not a url",
    "FEYMANTEC_SUPABASE_ANON_KEY": "sb_publishable_test_123",
  ]
  do {
    _ = try FeymantecBackendConfig.fromInfoDictionary(info)
    throw TestFailure(message: "expected invalid url to throw")
  } catch is FeymantecConfigError {
    // ok
  }
} ? 0 : 1

failures += run("FeymantecBackendConfig_fromInfoDictionary_secretKeyThrows") {
  let info: [String: Any] = [
    "FEYMANTEC_SUPABASE_FUNCTIONS_BASE_URL": "https://example.supabase.co/functions/v1",
    "FEYMANTEC_SUPABASE_ANON_KEY": "sb_secret_do_not_ship",
  ]
  do {
    _ = try FeymantecBackendConfig.fromInfoDictionary(info)
    throw TestFailure(message: "expected sb_secret_ to throw")
  } catch is FeymantecConfigError {
    // ok
  }
} ? 0 : 1

if failures > 0 {
  print("\n\(failures) test(s) failed")
  exit(1)
}

print("\nAll tests passed")
