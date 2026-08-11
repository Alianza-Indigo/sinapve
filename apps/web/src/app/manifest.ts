import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SINAPVE",
    short_name: "SINAPVE",
    description: "Plataforma Nacional del Agente Preventivo de Violencia Escolar",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F7FC",
    theme_color: "#34208C",
    lang: "es-MX",
    categories: ["education", "health", "government"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }]
  };
}
