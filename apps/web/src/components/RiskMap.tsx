"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// EP-08/12 / 11.2: mapa territorial con MapLibre GL. Usa un estilo base propio
// sin teselas externas (fondo institucional) para no depender de un proveedor de
// tiles en runtime; los puntos se dibujan desde GeoJSON. Solo agregados/recursos
// no sensibles (el detalle de expedientes nunca se mapea).

export type RiskPoint = { lng: number; lat: number; label: string; kind: string; weight?: number };

const blankStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#eef0f8" } }]
};

export function RiskMap({ points, center }: { points: RiskPoint[]; center?: [number, number] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const start: [number, number] = center ?? (points[0] ? [points[0].lng, points[0].lat] : [-102.5, 23.6]);
    const map = new maplibregl.Map({
      container: ref.current,
      style: blankStyle,
      center: start,
      zoom: points.length ? 5 : 3.4,
      attributionControl: false
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: points.map((point) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [point.lng, point.lat] },
            properties: { label: point.label, kind: point.kind, weight: point.weight ?? 1 }
          }))
        }
      });
      map.addLayer({
        id: "points-circles",
        type: "circle",
        source: "points",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "weight"], 0, 5, 100, 16],
          "circle-color": "#34208c",
          "circle-opacity": 0.8,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1
        }
      });
      map.on("click", "points-circles", (event: maplibregl.MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const props = feature.properties as { label?: string; kind?: string };
        new maplibregl.Popup()
          .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
          .setText(`${props.label ?? "Punto"} (${props.kind ?? ""})`)
          .addTo(map);
      });
    });

    return () => map.remove();
  }, [points, center]);

  return (
    <div>
      <div ref={ref} role="img" aria-label={`Mapa territorial con ${points.length} puntos`} style={{ width: "100%", height: "22rem", borderRadius: 8, overflow: "hidden" }} />
      <details>
        <summary className="muted">Tabla de datos equivalente del mapa</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Punto</th>
                <th scope="col">Tipo</th>
                <th scope="col">Peso</th>
              </tr>
            </thead>
            <tbody>
              {points.length === 0 ? (
                <tr>
                  <td colSpan={3}>Sin puntos territoriales cargados.</td>
                </tr>
              ) : (
                points.map((point, index) => (
                  <tr key={`map-row-${index}`}>
                    <th scope="row">{point.label}</th>
                    <td>{point.kind}</td>
                    <td>{point.weight ?? 1}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
