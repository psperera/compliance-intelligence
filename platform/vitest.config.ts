import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    globals: false,
    reporters: "default",
    coverage: {
      provider: "v8",
      include: ["lib/diff/**", "lib/auth/**"],
      reporter: ["text", "html"],
    },
  },
});
