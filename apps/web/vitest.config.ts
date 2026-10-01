import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    alias: {
      "@": new URL(".", import.meta.url).pathname,
      "@canvas": new URL("../../src", import.meta.url).pathname,
      "server-only": new URL("./test/server-only.ts", import.meta.url).pathname,
    },
  },
});
