// swift-tools-version: 6.2
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "FeymantecCore",
    products: [
        // Products define the executables and libraries a package produces, making them visible to other packages.
        .library(
            name: "FeymantecCore",
            targets: ["FeymantecCore"]
        ),
        .executable(
            name: "FeymantecCoreTdd",
            targets: ["FeymantecCoreTdd"]
        ),
    ],
    targets: [
        // Targets are the basic building blocks of a package, defining a module or a test suite.
        // Targets can depend on other targets in this package and products from dependencies.
        .target(
            name: "FeymantecCore"
        ),
        // NOTE: We intentionally keep the package buildable without XCTest/Swift Testing availability.
        // Add a proper test target once Xcode is configured on the machine running CI.
        .executableTarget(
            name: "FeymantecCoreTdd",
            dependencies: ["FeymantecCore"]
        ),
    ]
)
