import type { Config } from "tailwindcss";

// EP / 5 / 11.2: Tailwind CSS con los tokens de la paleta institucional del PRD.
// Convive con el sistema de estilos existente (globals.css); las utilidades
// Tailwind quedan disponibles para nuevos componentes accesibles.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        indigo: "#34208c",
        violet: "#6d4bd1",
        gold: "#d8a815",
        page: "#f7f7fc",
        surface: "#ffffff",
        ink: "#1e2030",
        muted: "#64677a",
        success: "#168a5b",
        warning: "#c87a00",
        critical: "#c9363e"
      }
    }
  },
  plugins: [],
  // Se desactiva preflight para convivir con el sistema de estilos existente
  // (globals.css) sin resetear su tipografia ni sus componentes.
  corePlugins: { preflight: false }
};

export default config;
