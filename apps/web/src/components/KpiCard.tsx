import type { MetricWidget } from "@/server/domain/types";

export function KpiCard({ widget }: { widget: MetricWidget }) {
  const first = widget.series[0];
  const percent = first?.target ? Math.min(100, Math.round((first.value / first.target) * 100)) : Math.min(100, first?.value ?? 0);

  return (
    <article className="panel metric" aria-labelledby={`${widget.id}-title`}>
      <p className="eyebrow">{widget.id.replaceAll("_", " ")}</p>
      <h3 id={`${widget.id}-title`}>{widget.title}</h3>
      <div className="metric-value">{widget.valueLabel}</div>
      <div className="bar" aria-label={`Avance ${percent}%`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="muted">Calidad {widget.quality}% · Supresiones {widget.privacySuppressedCells}</p>
    </article>
  );
}
