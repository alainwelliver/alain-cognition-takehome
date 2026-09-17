import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    fileParallelism: false,
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 30000,
  },
});
