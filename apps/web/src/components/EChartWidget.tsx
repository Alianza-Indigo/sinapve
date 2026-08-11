"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { MetricWidget } from "@/server/domain/types";

const PALETTE = ["#c9363e", "#c87a00", "#d8a815", "#168a5b", "#34208c", "#6d4bd1"];
const AXIS_COLOR = "#64677a";

// Construye la opción de ECharts según el tipo de visualización certificado.
// El gráfico es solo la capa visual; la fuente de verdad es la serie del servidor.
function buildOption(widget: MetricWidget): echarts.EChartsCoreOption {
  const labels = widget.series.map((point) => point.label);
  const values = widget.series.map((point) => point.value);

  if (widget.visualization === "donut") {
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
      color: PALETTE,
      tooltip: { trigger: "item" },
      legend: { bottom: 0, textStyle: { color: AXIS_COLOR }, itemWidth: 10, itemHeight: 10 },
      series: [
        {
          type: "pie",
          radius: ["54%", "74%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          label: { show: true, position: "center", formatter: `${total}\nTotal`, fontSize: 20, fontWeight: 700, color: "#1e2030" },
          labelLine: { show: false },
          data: widget.series.map((point) => ({ name: point.label, value: point.value }))
        }
      ]
    };
  }

  if (widget.visualization === "gauge") {
    const value = values[0] ?? 0;
    const max = widget.series[0]?.target ?? 100;
    return {
      series: [
        {
          type: "gauge",
          min: 0,
          max,
          progress: { show: true, width: 12, itemStyle: { color: "#34208c" } },
          axisLine: { lineStyle: { width: 12, color: [[1, "#e7e2f6"]] } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { color: AXIS_COLOR, fontSize: 10 },
          pointer: { itemStyle: { color: "#34208c" } },
          detail: { valueAnimation: true, fontSize: 24, fontWeight: 700, color: "#1e2030", offsetCenter: [0, "60%"] },
          data: [{ value }]
        }
      ]
    };
  }

  if (widget.visualization === "radar") {
    const max = Math.max(100, ...values);
    return {
      color: ["#34208c"],
      tooltip: { trigger: "item" },
      radar: {
        indicator: widget.series.map((point) => ({ name: point.label, max })),
        axisName: { color: AXIS_COLOR, fontSize: 11 },
        splitLine: { lineStyle: { color: "#e7e2f6" } },
        splitArea: { areaStyle: { color: ["#faf9fe", "#f3f1fb"] } }
      },
      series: [{ type: "radar", areaStyle: { opacity: 0.2 }, data: [{ value: values, name: widget.title }] }]
    };
  }

  if (widget.visualization === "bar_horizontal") {
    return {
      grid: { left: 90, right: 24, top: 12, bottom: 24 },
      tooltip: { trigger: "axis" },
      xAxis: { type: "value", axisLabel: { color: AXIS_COLOR } },
      yAxis: { type: "category", data: labels, axisLabel: { color: AXIS_COLOR } },
      series: [{ type: "bar", data: values, itemStyle: { color: "#6d4bd1", borderRadius: [0, 6, 6, 0] }, barWidth: "58%" }]
    };
  }

  // line / histogram / bullet / map → línea o barra vertical.
  const hasTarget = widget.series.some((point) => typeof point.target === "number");
  const type = widget.visualization === "line" ? "line" : "bar";
  return {
    color: ["#34208c", "#d8a815"],
    grid: { left: 40, right: 16, top: 16, bottom: 48 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: labels, axisLabel: { rotate: labels.length > 6 ? 40 : 0, color: AXIS_COLOR } },
    yAxis: { type: "value", axisLabel: { color: AXIS_COLOR } },
    series: [
      { name: widget.title, type, data: values, smooth: type === "line", itemStyle: { color: "#34208c", borderRadius: type === "bar" ? [6, 6, 0, 0] : 0 } },
      ...(hasTarget
        ? [{ name: "Meta", type: "line", data: widget.series.map((p) => p.target ?? null), itemStyle: { color: "#d8a815" }, lineStyle: { type: "dashed" } }]
        : [])
    ]
  };
}

// EP-13 / 11.2: representacion interactiva de una metrica certificada con Apache
// ECharts. Mantiene una tabla de datos equivalente para accesibilidad (8.1) y
// una paleta institucional. El grafico es una capa visual; la fuente de verdad
// es la serie certificada calculada en el servidor.
export function EChartWidget({ widget }: { widget: MetricWidget }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "svg" });
    chart.setOption(buildOption(widget));

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
