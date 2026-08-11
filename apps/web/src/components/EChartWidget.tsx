"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { MetricWidget } from "@/server/domain/types";

// EP-13 / 11.2: representacion interactiva de una metrica certificada con Apache
// ECharts. Mantiene una tabla de datos equivalente para accesibilidad (8.1) y
// una paleta institucional. El grafico es una capa visual; la fuente de verdad
// es la serie certificada calculada en el servidor.
export function EChartWidget({ widget }: { widget: MetricWidget }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "svg" });
    const labels = widget.series.map((point) => point.label);
    const values = widget.series.map((point) => point.value);
    const hasTarget = widget.series.some((point) => typeof point.target === "number");
    const type = widget.visualization === "line" ? "line" : "bar";

    chart.setOption({
      color: ["#34208c", "#d8a815"],
      grid: { left: 40, right: 16, top: 16, bottom: 48 },
      tooltip: { trigger: "axis" },
      xAxis: { type: "category", data: labels, axisLabel: { rotate: labels.length > 6 ? 40 : 0, color: "#64677a" } },
      yAxis: { type: "value", axisLabel: { color: "#64677a" } },
      series: [
        { name: widget.title, type, data: values, smooth: type === "line", itemStyle: { color: "#34208c" } },
        ...(hasTarget
          ? [{ name: "Meta", type: "line", data: widget.series.map((p) => p.target ?? null), itemStyle: { color: "#d8a815" }, lineStyle: { type: "dashed" } }]
          : [])
      ]
    });

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [widget]);

  return (
    <figure className="panel" aria-labelledby={`${widget.id}-ec-title`}>
      <p className="eyebrow">{widget.id.replaceAll("_", " ")}</p>
      <h3 id={`${widget.id}-ec-title`}>{widget.title}</h3>
      <p className="metric-value">{widget.valueLabel}</p>
      <div ref={ref} role="img" aria-label={`${widget.title}: ${widget.valueLabel}`} style={{ width: "100%", height: "12rem" }} />
      <details>
        <summary className="muted">Tabla de datos equivalente</summary>
        <div className="table-wrap">
          <table>
            <caption className="muted">
              Calidad {widget.quality}% · Celdas suprimidas {widget.privacySuppressedCells}
            </caption>
            <thead>
              <tr>
                <th scope="col">Categoria</th>
                <th scope="col">Valor</th>
                <th scope="col">Meta</th>
              </tr>
            </thead>
            <tbody>
              {widget.series.length === 0 ? (
                <tr>
                  <td colSpan={3}>Sin datos.</td>
                </tr>
              ) : (
                widget.series.map((point, index) => (
                  <tr key={`${widget.id}-ec-row-${index}`}>
                    <th scope="row">{point.label}</th>
                    <td>{point.value}</td>
                    <td>{typeof point.target === "number" ? point.target : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
