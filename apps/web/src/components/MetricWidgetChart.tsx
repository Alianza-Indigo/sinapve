import type { MetricWidget } from "@/server/domain/types";

// EP-13 / 8: representacion accesible de una metrica certificada. Usa SVG propio
// (sin librerias externas), con role="img" y etiqueta, patron monocromatico
// imprimible y una tabla de datos equivalente navegable por teclado (8.1, 8.6).
export function MetricWidgetChart({ widget }: { widget: MetricWidget }) {
  const series = widget.series.slice(0, 24);
  const max = series.reduce((acc, point) => Math.max(acc, point.value, point.target ?? 0), 0);
  const barWidth = 100 / Math.max(series.length, 1);

  const summary = `${widget.title}. ${widget.valueLabel}. ${series
    .map((point) => `${point.label}: ${point.value}`)
    .join(", ")}.`;

  return (
    <figure className="panel metric-chart" aria-labelledby={`${widget.id}-chart-title`}>
      <figcaption>
        <p className="eyebrow">{widget.id.replaceAll("_", " ")}</p>
        <h3 id={`${widget.id}-chart-title`}>{widget.title}</h3>
        <p className="metric-value">{widget.valueLabel}</p>
      </figcaption>

      {series.length === 0 ? (
        <p className="muted">Sin datos para el periodo seleccionado.</p>
      ) : (
        <svg
          className="metric-chart-svg"
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
          role="img"
          aria-label={summary}
          style={{ width: "100%", height: "9rem" }}
        >
          {series.map((point, index) => {
            const height = max === 0 ? 0 : (point.value / max) * 54;
            const x = index * barWidth;
            return (
              <g key={`${widget.id}-${point.label}-${index}`}>
                <rect
                  x={x + barWidth * 0.15}
                  y={60 - height}
                  width={barWidth * 0.7}
                  height={height}
                  fill="currentColor"
                />
                {typeof point.target === "number" && max > 0 ? (
                  <line
                    x1={x}
                    x2={x + barWidth}
                    y1={60 - (point.target / max) * 54}
                    y2={60 - (point.target / max) * 54}
                    stroke="currentColor"
                    strokeDasharray="1 1"
                    strokeWidth={0.4}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
      )}

      <details>
        <summary>Tabla de datos equivalente</summary>
        <div className="table-wrap">
          <table>
            <caption className="muted">
              Calidad {widget.quality}% · Celdas suprimidas por privacidad {widget.privacySuppressedCells}
            </caption>
            <thead>
              <tr>
                <th scope="col">Categoria</th>
                <th scope="col">Valor</th>
                <th scope="col">Meta</th>
              </tr>
            </thead>
            <tbody>
              {series.length === 0 ? (
                <tr>
                  <td colSpan={3}>Sin datos.</td>
                </tr>
              ) : (
                series.map((point, index) => (
                  <tr key={`${widget.id}-row-${point.label}-${index}`}>
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
