"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Datum = { label: string; value: number };

const blankStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#eef0f8" } }]
};

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function tier(value: number, max: number) {
  if (max <= 0) return { color: "#c5c9db", label: "sin dato" };
  const ratio = value / max;
  if (ratio >= 0.66) return { color: "#c9363e", label: "alto" };
  if (ratio >= 0.33) return { color: "#d8a815", label: "medio" };
  if (ratio > 0) return { color: "#168a5b", label: "bajo" };
  return { color: "#c5c9db", label: "sin dato" };
}

// Mapa territorial por estado. Si existe public/geo/mexico-estados.geojson dibuja
// un choropleth de polígonos con MapLibre (sin teselas externas); si no, muestra
// un mapa de estados funcional (barras coloreadas por INRE). Solo agregados.
export function TerritorialMap({ series, geojsonUrl = "/geo/mexico-estados.geojson" }: { series: Datum[]; geojsonUrl?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"loading" | "choropleth" | "list">("loading");
  const max = series.reduce((acc, item) => Math.max(acc, item.value), 0);

  useEffect(() => {
    let cancelled = false;
    let map: maplibregl.Map | null = null;

    (async () => {
      try {
        const res = await fetch(geojsonUrl, { cache: "no-store" });
        if (!res.ok) throw new Error("no-geojson");
        const geo = (await res.json()) as GeoJSON.FeatureCollection;
        if (cancelled || !ref.current) return;

        // Inyecta el valor por estado en las propiedades, emparejando por nombre.
        const byName = new Map(series.map((item) => [normalize(item.label), item.value]));
        for (const feature of geo.features) {
          const props = feature.properties ?? {};
          const nameKey = ["name", "NOMBRE", "ESTADO", "nom_ent", "state_name"].find((key) => typeof props[key] === "string");
          const name = nameKey ? String(props[nameKey]) : "";
          (feature.properties as Record<string, unknown>).__value = byName.get(normalize(name)) ?? 0;
        }

        map = new maplibregl.Map({ container: ref.current, style: blankStyle, center: [-102, 23.5], zoom: 3.6, attributionControl: false });
        map.on("load", () => {
          if (!map) return;
          map.addSource("estados", { type: "geojson", data: geo });
          map.addLayer({
            id: "estados-fill",
            type: "fill",
            source: "estados",
            paint: {
              "fill-color": ["interpolate", ["linear"], ["get", "__value"], 0, "#c5c9db", Math.max(1, max) * 0.33, "#168a5b", Math.max(1, max) * 0.66, "#d8a815", Math.max(1, max), "#c9363e"],
              "fill-opacity": 0.85
            }
          });
          map.addLayer({ id: "estados-line", type: "line", source: "estados", paint: { "line-color": "#ffffff", "line-width": 0.8 } });
        });
        setMode("choropleth");
      } catch {
        if (!cancelled) setMode("list");
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [geojsonUrl, series, max]);

  if (mode === "choropleth") {
    return <div ref={ref} role="img" aria-label="Mapa territorial de riesgo por estado" style={{ width: "100%", height: "16rem", borderRadius: 12, overflow: "hidden" }} />;
  }

  const ranked = [...series].filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);

  return (
    <div>
      {/* Contenedor oculto para el intento de choropleth mientras carga. */}
      <div ref={ref} style={{ display: "none" }} />
      {ranked.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.9rem" }}>Sin señales territoriales en el alcance actual.</p>
      ) : (
        <ul className="territ-list">
          {ranked.map((item) => {
            const t = tier(item.value, max);
            return (
              <li key={item.label} className="territ-row">
                <span className="territ-name">{item.label}</span>
                <span className="territ-bar"><span style={{ width: `${Math.round((item.value / max) * 100)}%`, background: t.color }} /></span>
                <span className="territ-value">{item.value}</span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="territ-legend">
        <span><i style={{ background: "#168a5b" }} /> Bajo</span>
        <span><i style={{ background: "#d8a815" }} /> Medio</span>
        <span><i style={{ background: "#c9363e" }} /> Alto</span>
      </div>
    </div>
  );
}
