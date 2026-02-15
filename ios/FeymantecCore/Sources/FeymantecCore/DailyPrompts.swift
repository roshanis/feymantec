import Foundation

public enum DailyPrompts {
  public static let all: [String] = [
    "Explain how compound interest works",
    "Explain the scientific method",
    "Explain supply and demand",
    "Explain how DNS works",
    "Explain the water cycle",
    "Explain why the sky is blue",
    "Explain how vaccines work",
    "Explain the concept of inflation",
    "Explain how search engines rank pages",
    "Explain the greenhouse effect",
    "Explain how neural networks learn",
    "Explain recursion in programming",
    "Explain why planes can fly",
    "Explain the theory of evolution",
    "Explain how encryption protects data",
  ]

  public static var today: String {
    let cal = Calendar.current
    let now = Date()
    let startOfYear = cal.date(from: cal.dateComponents([.year], from: now))!
    let day = cal.dateComponents([.day], from: startOfYear, to: now).day ?? 0
    return all[day % all.count]
  }
}
