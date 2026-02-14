import Foundation

public struct PreviewCard: Equatable, Sendable {
  public struct QuizItem: Equatable, Sendable {
    public let q: String
    public let a: String

    public init(q: String, a: String) {
      self.q = q
      self.a = a
    }
  }

  public let concept: String
  public let v1: String
  public let score: Int
  public let jargon: [String]
  public let gaps: [String]
  public let simple: [String]
  public let analogy: String
  public let quiz: [QuizItem]

  public init(
    concept: String,
    v1: String,
    score: Int,
    jargon: [String],
    gaps: [String],
    simple: [String],
    analogy: String,
    quiz: [QuizItem]
  ) {
    self.concept = concept
    self.v1 = v1
    self.score = score
    self.jargon = jargon
    self.gaps = gaps
    self.simple = simple
    self.analogy = analogy
    self.quiz = quiz
  }
}
