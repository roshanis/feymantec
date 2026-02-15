import Foundation

public enum FeymantecConfigError: Error {
  case missingKey(String)
  case invalidURL(String)
  case invalidAnonKey(String)
}

public struct FeymantecBackendConfig: Sendable, Equatable {
  public static let functionsBaseURLKey = "FEYMANTEC_SUPABASE_FUNCTIONS_BASE_URL"
  public static let anonKeyKey = "FEYMANTEC_SUPABASE_ANON_KEY"

  public let functionsBaseURL: URL
  public let anonKey: String

  public init(functionsBaseURL: URL, anonKey: String) throws {
    guard !anonKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw FeymantecConfigError.invalidAnonKey("anon key is empty")
    }

    // Supabase publishable keys are expected in client code. Never ship secret keys.
    if anonKey.lowercased().hasPrefix("sb_secret_") {
      throw FeymantecConfigError.invalidAnonKey("looks like a Supabase secret key (sb_secret_)")
    }

    guard functionsBaseURL.scheme?.lowercased() == "https" else {
      throw FeymantecConfigError.invalidURL("functions base url must be https")
    }

    self.functionsBaseURL = functionsBaseURL
    self.anonKey = anonKey
  }

  public static func fromInfoDictionary(_ info: [String: Any]) throws -> FeymantecBackendConfig {
    let baseURLRaw = info[functionsBaseURLKey] as? String
    let anonRaw = info[anonKeyKey] as? String

    guard let baseURLRaw else { throw FeymantecConfigError.missingKey(functionsBaseURLKey) }
    guard let anonRaw else { throw FeymantecConfigError.missingKey(anonKeyKey) }

    guard let url = URL(string: baseURLRaw.trimmingCharacters(in: .whitespacesAndNewlines)) else {
      throw FeymantecConfigError.invalidURL("invalid url: \(baseURLRaw)")
    }

    return try FeymantecBackendConfig(functionsBaseURL: url, anonKey: anonRaw)
  }
}

