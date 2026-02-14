import Foundation

public extension String {
  func fey_safeTrim() -> String {
    let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty { return "" }

    // Collapse all whitespace (spaces, newlines, tabs) to single spaces.
    let parts = trimmed.split(whereSeparator: { $0.isWhitespace })
    return parts.joined(separator: " ")
  }

  func fey_wordCount() -> Int {
    let t = fey_safeTrim()
    if t.isEmpty { return 0 }
    return t.split(separator: " ").count
  }
}
