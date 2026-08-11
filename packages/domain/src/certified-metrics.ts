// EP-13 / 8.3 / 8.6: catalogo de metricas certificadas con formula, version,
// propietario, inclusiones/exclusiones y politica de privacidad. La misma
// definicion alimenta tarjeta, grafica, CSV e informe, de modo que ninguna capa
// recalcula formulas distintas en el navegador. La supresion de celdas pequenas
// se aplica en servidor antes de exponer series.

export type CertifiedMetric = {
  code: string;
  version: number;
  owner: string;
  description: string;
  formula: string;
  includes: string;
  excludes: string;
  minimumCellCount: number;
};

export const certifiedMetrics: CertifiedMetric[] = [
  {
    code: "tasa_incidencia",
    version: 1,
    owner: "National_Analytics_Office",
    description: "Casos validos por cada 1,000 estudiantes en el periodo.",
    formula: "casos_validos / matricula_media_periodo * 1000",
    includes: "casos con severidad confirmada por humano",
    excludes: "reportes descartados y duplicados fusionados",
    minimumCellCount: 10
  },
  {
    code: "tiempo_primera_respuesta",
    version: 1,
    owner: "National_Analytics_Office",
    description: "Minutos entre reporte recibido y primera accion protectora.",
    formula: "timestamp_primera_accion_protectora - timestamp_reporte_recibido",
    includes: "primera accion protectora registrada en expediente",
    excludes: "acciones administrativas no protectoras",
    minimumCellCount: 5
  },
  {
    code: "cumplimiento_sla",
    version: 1,
    owner: "National_Analytics_Office",
    description: "Porcentaje de casos con primera respuesta dentro del SLA.",
    formula: "casos_con_primera_respuesta_en_sla / casos_elegibles * 100",
    includes: "casos elegibles con SLA vigente",
    excludes: "casos con SLA pausado por motivo permitido",
    minimumCellCount: 5
  },
  {
    code: "tasa_reincidencia_6m",
    version: 1,
    owner: "National_Analytics_Office",
    description: "Casos con nueva incidencia dentro de 6 meses.",
    formula: "casos_con_nueva_incidencia_6m / casos_cerrados_elegibles * 100",
    includes: "casos cerrados con seguimiento a 6 meses",
    excludes: "casos cerrados por error o duplicidad",
    minimumCellCount: 10
  },
  {
    code: "cobertura_certificacion",
    version: 1,
    owner: "National_Analytics_Office",
    description: "Personal obligado con certificacion vigente.",
    formula: "personal_con_certificacion_vigente / personal_obligado_activo * 100",
    includes: "personal obligado activo",
    excludes: "personal en baja o licencia",
    minimumCellCount: 5
  },
  {
    code: "escalamiento_efectivo",
    version: 1,
    owner: "National_Analytics_Office",
    description: "Referencias con acuse y accion sobre referencias enviadas.",
    formula: "referencias_con_acuse_y_accion / referencias_enviadas_elegibles * 100",
    includes: "referencias enviadas elegibles con destino competente",
    excludes: "referencias anuladas antes del envio",
    minimumCellCount: 5
  },
  {
    code: "completitud_dato",
    version: 1,
    owner: "National_Analytics_Office",
    description: "Campos requeridos validos sobre esperados.",
    formula: "campos_requeridos_validos / campos_requeridos_esperados * 100",
    includes: "campos marcados como requeridos por catalogo",
    excludes: "campos opcionales o derivados",
    minimumCellCount: 1
  }
];

const metricsByCode = new Map(certifiedMetrics.map((metric) => [metric.code, metric]));

export function getCertifiedMetric(code: string): CertifiedMetric | null {
  return metricsByCode.get(code) ?? null;
}

export type MetricCell = { label: string; value: number; count?: number };

export type SuppressionResult = {
  cells: Array<MetricCell & { suppressed: boolean }>;
  suppressedCount: number;
};

// Suprime celdas cuyo conteo cae bajo el umbral de privacidad antes de exponer
// datos. Una celda suprimida no revela su valor (8.1, 12.2).
export function suppressSmallCells(cells: MetricCell[], minimumCellCount: number): SuppressionResult {
  let suppressedCount = 0;
  const result = cells.map((cell) => {
    const count = cell.count ?? cell.value;
    const suppressed = count > 0 && count < minimumCellCount;
    if (suppressed) suppressedCount += 1;
    return {
      label: cell.label,
      value: suppressed ? 0 : cell.value,
      count: suppressed ? undefined : cell.count,
      suppressed
    };
  });
  return { cells: result, suppressedCount };
}
