import { expect, test } from "@playwright/test";

// EP / 13.1 (WCAG 2.2 AA): comprobaciones basicas de accesibilidad en las
// paginas publicas. Cobertura ligera sin dependencias adicionales; complementa,
// no reemplaza, la auditoria manual.
const publicPages = ["/", "/seguimiento", "/transparencia"];

for (const path of publicPages) {
  test(`accesibilidad basica en ${path}`, async ({ page }) => {
    await page.goto(path);
    // Idioma declarado en el documento.
    await expect(page.locator("html")).toHaveAttribute("lang", /.+/);
    // Un unico encabezado principal por pagina.
    await expect(page.locator("h1")).toHaveCount(1);
    // Region principal presente.
    await expect(page.locator("main")).toBeVisible();
    // Ninguna imagen sin texto alternativo.
    const imagesWithoutAlt = await page.locator("img:not([alt])").count();
    expect(imagesWithoutAlt).toBe(0);
  });
}
