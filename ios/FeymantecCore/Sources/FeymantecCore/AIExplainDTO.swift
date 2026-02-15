import Foundation

public struct AIExplainRequest: Codable, Sendable {
  public var inputText: String
  public var topic: String
  public var mode: String
  public var conversation: [ConversationTurn]

  public struct ConversationTurn: Codable, Sendable {
    public var role: String
    public var content: String

    public init(role: String, content: String) {
      self.role = role
      self.content = content
    }
  }

  public init(inputText: String, topic: String, mode: String, conversation: [ConversationTurn] = []) {
    self.inputText = inputText
    self.topic = topic
    self.mode = mode
    self.conversation = conversation
  }
}

public struct AIExplainResponse: Codable, Sendable {
  public var resultText: String
  public var suggestions: [String]
  public var score: Int?
  public var model: String?

  public init(resultText: String, suggestions: [String], score: Int? = nil, model: String? = nil) {
    self.resultText = resultText
    self.suggestions = suggestions
    self.score = score
    self.model = model
  }
}
