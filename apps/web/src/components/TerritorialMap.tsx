"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

type Datum = { label: string; value: number };
type GeoFeature = { properties: { name: string }; geometry: unknown };
type GeoCollection = { type: string; features: GeoFeature[] };

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function tier(value: number, max: number) {
  if (max <= 0) return "#c5c9db";
  const ratio = value / max;
  if (ratio >= 0.66) return "#c9363e";
  if (ratio >= 0.33) return "#d8a815";
  if (ratio > 0) return "#168a5b";
  return "#c5c9db";
}

// Mapa territorial (choropleth) de los estados de México con ECharts. Registra el
// GeoJSON de public/geo/mexico-estados.geojson (coordenadas proyectadas propias) y
// colorea cada estado por su señal (INRE). Si el GeoJSON falta o falla la carga,
// muestra un mapa de estados funcional (barras coloreadas). Solo agregados.
export function TerritorialMap({ series, geojsonUrl = "/geo/mexico-estados.geojson" }: { series: Datum[]; geojsonUrl?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"loading" | "choropleth" | "list">("loading");
  const max = series.reduce((acc, item) => Math.max(acc, item.value), 0);

  useEffect(() => {
    let cancelled = false;
    let chart: echarts.ECharts | null = null;

    (async () => {
      try {
        const res = await fetch(geojsonUrl, { cache: "force-cache" });
        if (!res.ok) throw new Error("no-geojson");
        const geo = (await res.json()) as GeoCollection;
        if (cancelled || !ref.current) return;

        echarts.registerMap("mexico-estados", geo as never);
        const nameByNorm = new Map(geo.features.map((feature) => [normalize(feature.properties.name), feature.properties.name]));
        const data = series
          .map((item) => {
            const canonical = nameByNorm.get(normalize(item.label));
            return canonical ? { name: canonical, value: item.value } : null;
          })
          .filter((item): item is { name: string; value: number } => item !== null);

        chart = echarts.init(ref.current, undefined, { renderer: "svg" });
        chart.setOption({
          tooltip: { trigger: "item", formatter: (p: { name: string; value?: number }) => `${p.name}: ${p.value ?? "sin dato"}` },
          visualMap: {
            min: 0,
            max: Math.max(1, max),
            left: 6,
            bottom: 6,
            itemHeight: 70,
            calculable: true,
            inRange: { color: ["#eef0f8", "#168a5b", "#d8a815", "#c9363e"] },
            textStyle: { color: "#64677a", fontSize: 10 }
          },
          series: [
            {
              type: "map",
              map: "mexico-estados",
              nameProperty: "name",
              roam: false,
              itemStyle: { areaColor: "#e9ecf6", borderColor: "#ffffff", borderWidth: 0.6 },
              emphasis: { itemStyle: { areaColor: "#6d4bd1" }, label: { show: false } },
              select: { disabled: true },
              data
            }
          ]
        });
        setMode("choropleth");
      } catch {
        if (!cancelled) setMode("list");
      }
    })();

    const onResize = () => chart?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      chart?.dispose();
    };
  }, [geojsonUrl, series, max]);

  const ranked = [...series].filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);

  return (
    <div>
      <div
        ref={ref}
        role="img"
        aria-label="Mapa territorial de riesgo por estado"
        style={{ width: "100%", height: "16rem", overflow: "hidden", display: mode === "list" ? "none" : "block" }}
      />
      {mode === "list" ? (
        <>
          {ranked.length === 0 ? (
            <p className="muted" style={{ fontSize: "0.9rem" }}>Sin señales territoriales en el alcance actual.</p>
          ) : (
            <ul className="territ-list">
              {ranked.map((item) => (
                <li key={item.label} className="territ-row">
                  <span className="territ-name">{item.label}</span>
                  <span className="territ-bar"><span style={{ width: `${Math.round((item.value / max) * 100)}%`, background: tier(item.value, max) }} /></span>
                  <span className="territ-value">{item.value}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="territ-legend">
            <span><i style={{ background: "#168a5b" }} /> Bajo</span>
            <span><i style={{ background: "#d8a815" }} /> Medio</span>
            <span><i style={{ background: "#c9363e" }} /> Alto</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
