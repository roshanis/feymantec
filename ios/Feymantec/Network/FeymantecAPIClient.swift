import Foundation
import FeymantecCore

actor FeymantecAPIClient {
  static let shared = FeymantecAPIClient()

  private var cachedConfig: FeymantecBackendConfig?

  private init() {}

  private func config() throws -> FeymantecBackendConfig {
    if let cachedConfig { return cachedConfig }

    let info = Bundle.main.infoDictionary ?? [:]
    let cfg = try FeymantecBackendConfig.fromInfoDictionary(info)
    cachedConfig = cfg
    return cfg
  }

  func callAIExplain(_ request: AIExplainRequest) async throws -> AIExplainResponse {
    let cfg = try config()
    let url = cfg.functionsBaseURL.appendingPathComponent("ai-explain")

    var urlRequest = URLRequest(url: url)
    urlRequest.httpMethod = "POST"
    urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
    urlRequest.setValue("Bearer \(cfg.anonKey)", forHTTPHeaderField: "Authorization")
    urlRequest.setValue(cfg.anonKey, forHTTPHeaderField: "apikey")
    urlRequest.timeoutInterval = 30
    urlRequest.httpBody = try JSONEncoder().encode(request)

    let (data, response) = try await URLSession.shared.data(for: urlRequest)

    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
      throw URLError(.badServerResponse, userInfo: [
        NSLocalizedDescriptionKey: "Server returned status \(statusCode)"
      ])
    }

    return try JSONDecoder().decode(AIExplainResponse.self, from: data)
  }
}
