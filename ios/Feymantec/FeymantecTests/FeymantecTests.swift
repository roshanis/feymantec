//
//  FeymantecTests.swift
//  FeymantecTests
//
//  Created by Roshan Venugopal on 2/14/26.
//

import Testing
import FeymantecCore
@testable import Feymantec

struct FeymantecTests {

    @Test func nsfwBlocksKnownTerms() {
        #expect(TopicPolicy.isLikelyNSFW("porn"))
        #expect(TopicPolicy.isLikelyNSFW("Hardcore"))
        #expect(!TopicPolicy.isLikelyNSFW("Photosynthesis"))
    }

    @Test func safeTrimCollapsesWhitespace() {
        #expect("  hello   world  ".fey_safeTrim() == "hello world")
        #expect("   ".fey_safeTrim() == "")
        #expect("no\textra\nspaces".fey_safeTrim() == "no extra spaces")
    }

    @Test func wordCountIsAccurate() {
        #expect("   ".fey_wordCount() == 0)
        #expect("hello   world".fey_wordCount() == 2)
        #expect("one".fey_wordCount() == 1)
    }

    @Test func previewCardBuilderScoresCorrectly() {
        let card = PreviewCardBuilder.buildPreviewCard(
            concept: "Neural networks",
            v1: "Neural networks are basically models that use backpropagation because they adjust weights."
        )
        #expect(card.concept == "Neural networks")
        #expect(card.score >= 42 && card.score <= 96)
        #expect(!card.gaps.isEmpty)
        #expect(!card.analogy.isEmpty)
        #expect(card.quiz.count == 2)
    }

    @Test func previewCardBuilderHandlesEmptyInput() {
        let card = PreviewCardBuilder.buildPreviewCard(concept: "", v1: "")
        #expect(card.concept == "")
        #expect(card.v1 == "")
        #expect(card.gaps.count == 3)
        #expect(card.simple.count == 5)
    }

    @Test func dailyPromptsNotEmpty() {
        #expect(!DailyPrompts.all.isEmpty)
        #expect(DailyPrompts.all.count == 15)
        #expect(!DailyPrompts.today.isEmpty)
    }

    @Test func dailyPromptRotatesByDay() {
        // today should always return a valid prompt from the list
        let prompt = DailyPrompts.today
        #expect(DailyPrompts.all.contains(prompt))
    }

    @Test func extractJargonFindsExpectedWords() {
        let text = "We use backpropagation with HTTP and SomeCamelCaseThing."
        let jargon = PreviewCardBuilder.extractJargonWords(text, max: 8)
        #expect(jargon.contains("backpropagation"))
        #expect(jargon.contains("HTTP"))
        #expect(jargon.contains("SomeCamelCaseThing"))
    }

    @Test func aiExplainRequestEncodesCorrectly() throws {
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
        #expect(dict["inputText"] as? String == "Photosynthesis converts light")
        #expect(dict["topic"] as? String == "Photosynthesis")
        #expect(dict["mode"] as? String == "intro")
    }

    @Test func aiExplainResponseDecodesFromServerJSON() throws {
        let json = """
        {
            "resultText": "Here is an intro.",
            "suggestions": ["Try an example", "Add a diagram"],
            "score": 42,
            "model": "gpt-5.2"
        }
        """.data(using: .utf8)!

        let resp = try JSONDecoder().decode(AIExplainResponse.self, from: json)
        #expect(resp.resultText == "Here is an intro.")
        #expect(resp.suggestions == ["Try an example", "Add a diagram"])
        #expect(resp.score == 42)
        #expect(resp.model == "gpt-5.2")
    }
}
