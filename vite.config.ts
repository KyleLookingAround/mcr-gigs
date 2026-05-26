import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
