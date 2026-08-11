import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Contrato: el catálogo obligatorio G01–G32 (PRD 8.2) tiene un modelo dbt por
// gráfica y cada uno declara su graph_id. Verifica la cobertura de la capa
// semántica sin ejecutar dbt.
const graphsDir = join(process.cwd(), "..", "..", "analytics", "dbt", "models", "graphs");

const graphIds = Array.from({ length: 32 }, (_, index) => `G${String(index + 1).padStart(2, "0")}`);

function modelFileFor(graphId: string): string | null {
  const n = graphId.slice(1);
  // Los archivos siguen el patrón gNN_nombre.sql
  const prefix = `g${n.toLowerCase()}_`;
  const fs = require("node:fs") as typeof import("node:fs");
  if (!existsSync(graphsDir)) return null;
  const match = fs.readdirSync(graphsDir).find((file: string) => file.startsWith(prefix) && file.endsWith(".sql"));
  return match ? join(graphsDir, match) : null;
}

describe("PRD 8.2 mandatory chart catalog (G01–G32) in dbt", () => {
  it.each(graphIds)("has a dbt model for %s declaring its graph_id", (graphId) => {
    const file = modelFileFor(graphId);
    expect(file, `Falta modelo dbt para ${graphId}`).not.toBeNull();
    const sql = readFileSync(file as string, "utf8");
    expect(sql, `${graphId} debe declarar graph_id '${graphId}'`).toContain(`'${graphId}'`);
  });
});
