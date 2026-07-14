import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "server-only": path.resolve("tests/stubs/server-only.ts"), "@": path.resolve("src") } },
  test: { environment: "node", globals: false },
});
