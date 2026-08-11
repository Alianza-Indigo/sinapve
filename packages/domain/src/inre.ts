// EP-08 / 7.6: Indice de Riesgo Escolar (INRE) como modelo CONFIGURABLE y
// VERSIONADO, no como suma fija incrustada en codigo. Expone pesos versionados,
// datos faltantes visibles, calidad/confianza del indicador y la contribucion de
// cada dimension. Nunca baja el riesgo ocultando reportes: los datos faltantes
// se marcan, no se asumen como cero favorable.

export type InreDimension =
  | "conductual"
  | "grupal"
  | "digital"
  | "ambiental"
  | "familiar"
  | "comunitaria"
  | "territorial";

export const inreDimensions: InreDimension[] = [
  "conductual",
  "grupal",
  "digital",
  "ambiental",
  "familiar",
  "comunitaria",
  "territorial"
];

export type InreModel = {
  version: number;
  owner: string;
  // Peso relativo de cada dimension (se normaliza al calcular).
  weights: Record<InreDimension, number>;
};

// Modelo base v1. Los pesos son configurables por catalogo/version; esta es la
// linea base nacional validable, sujeta a revision humana (7.6).
export const defaultInreModel: InreModel = {
  version: 1,
  owner: "National_Risk_Office",
  weights: {
    conductual: 0.2,
    grupal: 0.15,
    digital: 0.15,
    ambiental: 0.1,
    familiar: 0.15,
    comunitaria: 0.1,
    territorial: 0.15
  }
};

export type InreInput = Partial<Record<InreDimension, number>>;

export type InreFactor = {
  dimension: InreDimension;
  value: number | null;
  weight: number;
  contribution: number;
  missing: boolean;
};

export type InreResult = {
  modelVersion: number;
  score: number | null;
  factors: InreFactor[];
  missingDimensions: InreDimension[];
  // Calidad/confianza 0-100 segun cobertura de dimensiones observadas.
  quality: number;
  explanation: string;
};

function clamp01to100(value: number) {
  return Math.max(0, Math.min(100, value));
}

// Calcula el INRE a partir de valores observados por dimension (0-100 cada uno).
// Solo pondera dimensiones presentes y renormaliza sus pesos; las ausentes se
// reportan como faltantes (no se imputan como 0) para no ocultar riesgo ni
// inflarlo artificialmente.
export function computeInre(input: InreInput, model: InreModel = defaultInreModel): InreResult {
  const factors: InreFactor[] = inreDimensions.map((dimension) => {
    const raw = input[dimension];
    const present = typeof raw === "number" && Number.isFinite(raw);
    const value = present ? clamp01to100(raw as number) : null;
    return { dimension, value, weight: model.weights[dimension] ?? 0, contribution: 0, missing: !present };
  });

  const present = factors.filter((factor) => !factor.missing);
  const missingDimensions = factors.filter((factor) => factor.missing).map((factor) => factor.dimension);
  const totalPresentWeight = present.reduce((sum, factor) => sum + factor.weight, 0);

  let score: number | null = null;
  if (present.length > 0 && totalPresentWeight > 0) {
    score = 0;
    for (const factor of present) {
      const normalizedWeight = factor.weight / totalPresentWeight;
      factor.contribution = Math.round((factor.value as number) * normalizedWeight * 100) / 100;
      score += factor.contribution;
    }
    score = Math.round(score * 100) / 100;
  }

  const quality = Math.round((present.length / inreDimensions.length) * 100);
  const explanation =
    present.length === 0
      ? "Sin dimensiones observadas: el INRE no se calcula y se marca como dato faltante."
      : `INRE ${score} con ${present.length}/${inreDimensions.length} dimensiones observadas (modelo v${model.version}). ` +
        `Dimensiones faltantes: ${missingDimensions.length ? missingDimensions.join(", ") : "ninguna"}. ` +
        "Requiere revision humana antes de asignar recursos o iniciar auditoria.";

  return { modelVersion: model.version, score, factors, missingDimensions, quality, explanation };
}

// Construye un modelo a partir de una configuracion versionada (por ejemplo,
// desde system_configurations), validando dimensiones y cayendo al modelo base
// cuando la configuracion es incompleta.
export function resolveInreModel(config: { version?: number; owner?: string; weights?: Partial<Record<string, number>> } | null | undefined): InreModel {
  if (!config || !config.weights) return defaultInreModel;
  const weights = { ...defaultInreModel.weights };
  for (const dimension of inreDimensions) {
    const value = config.weights[dimension];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      weights[dimension] = value;
    }
  }
  return {
    version: typeof config.version === "number" ? config.version : defaultInreModel.version,
    owner: config.owner ?? defaultInreModel.owner,
    weights
  };
}
