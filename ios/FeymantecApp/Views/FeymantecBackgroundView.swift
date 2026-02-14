import SwiftUI

struct FeymantecBackgroundView: View {
  var body: some View {
    ZStack {
      LinearGradient(
        colors: [
          Color(red: 0.06, green: 0.06, blue: 0.08),
          Color(red: 0.02, green: 0.03, blue: 0.05),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
      .ignoresSafeArea()

      RadialGradient(
        colors: [
          Color(red: 0.80, green: 0.45, blue: 0.22).opacity(0.22),
          Color.clear,
        ],
        center: .topTrailing,
        startRadius: 20,
        endRadius: 420
      )
      .ignoresSafeArea()

      RadialGradient(
        colors: [
          Color(red: 0.25, green: 0.62, blue: 0.85).opacity(0.18),
          Color.clear,
        ],
        center: .bottomLeading,
        startRadius: 20,
        endRadius: 520
      )
      .ignoresSafeArea()
    }
  }
}
