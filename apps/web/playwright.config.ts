import { defineConfig, devices } from "@playwright/test";

// EP / 15: pruebas E2E de las rutas criticas. El servidor arranca en modo sin
// base de datos (degradado): las rutas transaccionales responden estados
// deterministas (401/403/503) y las publicas responden 200 con supresion de
// privacidad. Esto permite validar contratos y controles de acceso sin datos
// reales, en linea con "no cargar datos inventados".
const port = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined }
      }
    }
  ],
  webServer: {
    command: `corepack pnpm exec next start -p ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
