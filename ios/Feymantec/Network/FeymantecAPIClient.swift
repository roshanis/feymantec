import Foundation
import FeymantecCore

actor FeymantecAPIClient {
  static let shared = FeymantecAPIClient()

  private let baseURL = "https://narcpnqenogakxvkeiuh.supabase.co/functions/v1"
  // Publishable Supabase anon key — safe to embed in client code.
  // It only grants access to public edge functions; row-level security handles the rest.
  private let anonKey = "sb_publishable_lDimobFTWN3QVRPkgWSJyQ_ch45ioL7"

  private init() {}

  func callAIExplain(_ request: AIExplainRequest) async throws -> AIExplainResponse {
    guard let url = URL(string: "\(baseURL)/ai-explain") else {
      throw URLError(.badURL)
    }

    var urlRequest = URLRequest(url: url)
    urlRequest.httpMethod = "POST"
    urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
    urlRequest.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
    urlRequest.setValue(anonKey, forHTTPHeaderField: "apikey")
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
