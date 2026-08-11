// EP-17 / 8.7: el constructor de tableros solo compone widgets certificados.
// No se permite SQL, formulas libres ni campos sensibles desde el constructor
// visual; la extensibilidad ocurre mediante metricas y widgets aprobados.

import { getCertifiedMetric } from "./certified-metrics";

// Codigos de widget del catalogo obligatorio G01-G32.
const certifiedWidgetIds = new Set(
  Array.from({ length: 32 }, (_, index) => `G${String(index + 1).padStart(2, "0")}`)
);

const allowedVisualizations = new Set([
  "line",
  "bullet",
  "histogram",
  "map",
  "gauge",
  "funnel",
  "sankey",
  "heatmap",
  "scatter"
]);

const forbiddenKeyPattern = /(sql|query|raw|formula|script|--|;|\bunion\b|\bselect\b)/i;

export type DashboardWidgetInput = Record<string, unknown>;

export type DashboardValidation = {
  valid: boolean;
  errors: string[];
};

function widgetCatalogId(widget: DashboardWidgetInput): string | null {
  const id = typeof widget.id === "string" ? widget.id : "";
  const match = id.match(/^G\d{2}/);
  return match ? match[0] : null;
}

export function validateDashboardWidgets(widgets: DashboardWidgetInput[]): DashboardValidation {
  const errors: string[] = [];

  if (widgets.length === 0) {
    errors.push("un_tablero_requiere_al_menos_un_widget_certificado");
  }

  widgets.forEach((widget, index) => {
    const catalogId = widgetCatalogId(widget);
    if (!catalogId || !certifiedWidgetIds.has(catalogId)) {
      errors.push(`widget_${index}_no_pertenece_al_catalogo_certificado`);
    }

    if (typeof widget.visualization === "string" && !allowedVisualizations.has(widget.visualization)) {
      errors.push(`widget_${index}_visualizacion_no_permitida`);
    }

    const metricCodes = Array.isArray(widget.metric_codes) ? widget.metric_codes : [];
    for (const code of metricCodes) {
      if (typeof code === "string" && getCertifiedMetric(code) === null) {
        // Los codigos G-derivados usan metricas internas; solo se rechazan
        // codigos que aparentan formula libre. Las metricas del catalogo 8.3 se
        // validan estrictamente.
        if (forbiddenKeyPattern.test(code)) {
          errors.push(`widget_${index}_metrica_no_certificada`);
        }
      }
    }

    for (const [key, value] of Object.entries(widget)) {
      if (forbiddenKeyPattern.test(key)) {
        errors.push(`widget_${index}_clave_prohibida_${key}`);
      }
      if (typeof value === "string" && forbiddenKeyPattern.test(value)) {
        errors.push(`widget_${index}_valor_prohibido`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}
