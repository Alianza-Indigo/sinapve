import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Vitest cubre pruebas unitarias y de dominio. Las pruebas E2E (Playwright) viven
// en tests/e2e y se ejecutan con `pnpm test:e2e`, no con vitest.
const domainSrc = fileURLToPath(new URL("../../packages/domain/src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@sinapve\/domain\/(.*)$/, replacement: `${domainSrc}/$1.ts` },
      { find: "@sinapve/domain", replacement: `${domainSrc}/index.ts` }
    ]
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"]
  }
});
