module.exports = {
  testMatch: [
    "**/test-*.js"
  ],
  collectCoverageFrom: [
    "core/**/*.js",
    "nlp/**/*.js",
    "integration/**/*.js",
    "!**/node_modules/**",
    "!**/test-*.js"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  testEnvironment: "node",
  verbose: true,
  moduleFileExtensions: ["js", "json"],
  transformIgnorePatterns: [
    "/node_modules/"
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  },
  roots: ["<rootDir>"],
  testTimeout: 30000
};