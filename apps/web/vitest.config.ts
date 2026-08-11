import { defineConfig } from "vitest/config";

// Vitest cubre pruebas unitarias y de dominio. Las pruebas E2E (Playwright) viven
// en tests/e2e y se ejecutan con `pnpm test:e2e`, no con vitest.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"]
  }
});
