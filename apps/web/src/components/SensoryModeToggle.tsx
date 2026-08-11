"use client";

import { Contrast, Waves } from "lucide-react";
import { useState } from "react";

export function SensoryModeToggle() {
  const [mode, setMode] = useState<"standard" | "reduced" | "contrast">("standard");

  function applyMode(nextMode: "standard" | "reduced" | "contrast") {
    document.body.classList.toggle("sensory-reduced", nextMode === "reduced");
    document.body.classList.toggle("high-contrast", nextMode === "contrast");
    setMode(nextMode);
  }

  return (
    <div className="toolbar" role="group" aria-label="Modo sensorial">
      <button className="icon-button" type="button" onClick={() => applyMode("standard")} aria-pressed={mode === "standard"} title="Modo estandar">
        <Waves size={18} aria-hidden="true" />
      </button>
      <button className="icon-button" type="button" onClick={() => applyMode("reduced")} aria-pressed={mode === "reduced"} title="Modo reducido">
        <Waves size={18} aria-hidden="true" />
      </button>
      <button className="icon-button" type="button" onClick={() => applyMode("contrast")} aria-pressed={mode === "contrast"} title="Alto contraste">
        <Contrast size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
