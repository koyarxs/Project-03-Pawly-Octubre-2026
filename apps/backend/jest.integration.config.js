module.exports = {
  ...require("./jest.config"),
  testRegex: ".*\\.integration\\.spec\\.ts$",
  testPathIgnorePatterns: [],
  testTimeout: 30000,
};
