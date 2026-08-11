"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

// Botón "Instalar app": sustituye a las tiendas nativas por instalación PWA.
// Usa beforeinstallprompt cuando el navegador lo ofrece; si no, guía al usuario.
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) {
      setHint(true);
      return;
    }
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  if (installed) {
    return (
      <span className="status-pill safe" style={{ background: "transparent", color: "#cfcbe8", borderColor: "rgba(255,255,255,0.3)" }}>
        <Smartphone size={16} aria-hidden="true" /> App instalada
      </span>
    );
  }

  return (
    <div>
      <button type="button" className="btn-acceder" onClick={install} style={{ background: "#fff", color: "var(--indigo)" }}>
        <Download size={16} aria-hidden="true" /> Instalar app
      </button>
      {hint ? (
        <p style={{ fontSize: "0.78rem", opacity: 0.8, marginTop: 8, maxWidth: "26ch" }}>
          En tu navegador usa el menú → &quot;Agregar a pantalla de inicio&quot; para instalar SINAPVE.
        </p>
      ) : null}
    </div>
  );
}
