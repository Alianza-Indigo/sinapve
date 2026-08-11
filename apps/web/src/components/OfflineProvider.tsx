"use client";

import { useEffect } from "react";
import { syncReportDrafts } from "@/lib/offline/reports";

// Registra el service worker y sincroniza los borradores offline al cargar y al
// recuperar la red. No renderiza UI.
export function OfflineProvider() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data === "sinapve-sync-drafts") void syncReportDrafts().catch(() => {});
      });
    }

    const onOnline = () => void syncReportDrafts().catch(() => {});
    window.addEventListener("online", onOnline);
    void syncReportDrafts().catch(() => {}); // intento inicial por si quedaron pendientes

    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
