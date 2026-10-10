import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: "./test/global-setup.js",
    setupFiles: ["./test/setup.js"],
    // All files share one database, so they run one after another.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
});
