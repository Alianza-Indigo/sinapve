"use client";

import { useEffect, useState } from "react";
import { Contrast } from "lucide-react";

type Scale = "normal" | "large" | "xlarge";
const ORDER: Scale[] = ["normal", "large", "xlarge"];

// Barra de accesibilidad del portal: alto contraste, tamaño de fuente (Aa-/Aa+)
// e idioma. Persiste en localStorage; el idioma usa la cookie que lee i18n.
export function AccessibilityControls() {
  const [contrast, setContrast] = useState(false);
  const [scale, setScale] = useState<Scale>("normal");
  const [locale, setLocale] = useState("es");

  useEffect(() => {
    const savedContrast = localStorage.getItem("sinapve_contrast") === "1";
    const savedScale = (localStorage.getItem("sinapve_font_scale") as Scale) || "normal";
    setContrast(savedContrast);
    setScale(savedScale);
    document.body.classList.toggle("high-contrast", savedContrast);
    document.documentElement.dataset.fontScale = savedScale;
    const cookieLocale = document.cookie.split("; ").find((row) => row.startsWith("sinapve_locale="))?.split("=")[1];
    if (cookieLocale) setLocale(cookieLocale);
  }, []);

  const toggleContrast = () => {
    const next = !contrast;
    setContrast(next);
    document.body.classList.toggle("high-contrast", next);
    localStorage.setItem("sinapve_contrast", next ? "1" : "0");
  };

  const changeScale = (direction: 1 | -1) => {
    const index = Math.min(ORDER.length - 1, Math.max(0, ORDER.indexOf(scale) + direction));
    const next = ORDER[index];
    setScale(next);
    document.documentElement.dataset.fontScale = next;
    localStorage.setItem("sinapve_font_scale", next);
  };

  const changeLocale = (next: string) => {
    document.cookie = `sinapve_locale=${next}; path=/; max-age=31536000`;
    setLocale(next);
    location.reload();
  };

  return (
    <div className="util-group" role="group" aria-label="Accesibilidad">
      <button type="button" className="util-btn" onClick={toggleContrast} aria-pressed={contrast} title="Alto contraste">
        <Contrast size={15} aria-hidden="true" /> Alto contraste
      </button>
      <button type="button" className="util-btn" onClick={() => changeScale(-1)} aria-label="Reducir tamaño de texto" disabled={scale === "normal"}>
        Aa-
      </button>
      <button type="button" className="util-btn" onClick={() => changeScale(1)} aria-label="Aumentar tamaño de texto" disabled={scale === "xlarge"}>
        Aa+
      </button>
      <label className="util-group" style={{ gap: 4 }}>
        <span className="sr-only">Idioma</span>
        <select
          value={locale}
          onChange={(event) => changeLocale(event.target.value)}
          aria-label="Idioma"
          style={{ background: "transparent", color: "inherit", border: "none", cursor: "pointer", fontWeight: 600 }}
        >
          <option value="es">ES</option>
          <option value="en">EN</option>
        </select>
      </label>
    </div>
  );
}
