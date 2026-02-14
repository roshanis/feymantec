import Foundation

public enum TopicPolicy {
  public static func isLikelyNSFW(_ text: String) -> Bool {
    let t = text.lowercased()
    return t.range(
      of: "\\b(porn|xxx|nude|nudes|onlyfans|hardcore|hentai|blowjob|sex\\s+tape)\\b",
      options: [.regularExpression]
    ) != nil
  }
}
