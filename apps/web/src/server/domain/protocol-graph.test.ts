import { describe, expect, it } from "vitest";
import {
  compileProtocolGraph,
  graphFromSteps,
  validateProtocolGraph,
  type ProtocolGraph
} from "./protocol-graph";

function baseGraph(): ProtocolGraph {
  return {
    code: "proteccion_escolar",
    title: "Proteccion escolar",
    nodes: [
      { id: "inicio", kind: "inicio", title: "Confirmar seguridad", dueMinute: 5, requiredEvidence: true, x: 100, y: 80 },
      { id: "notificar", kind: "accion", title: "Notificar direccion", dueMinute: 10, requiredEvidence: true, x: 100, y: 220 },
      { id: "fin", kind: "fin", title: "Documentar cierre", dueMinute: 30, requiredEvidence: true, x: 100, y: 360 }
    ],
    edges: [
      { id: "e1", from: "inicio", to: "notificar" },
      { id: "e2", from: "notificar", to: "fin" }
    ]
  };
}

describe("protocol graph validation", () => {
  it("accepts a well-formed DAG from start to end", () => {
    const result = validateProtocolGraph(baseGraph());
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects a cycle", () => {
    const graph = baseGraph();
    graph.edges.push({ id: "e3", from: "fin", to: "inicio" });
    const result = validateProtocolGraph(graph);
    expect(result.ok).toBe(false);
    // fin con salida ya es un error; ademas se detecta ciclo si no cortara antes.
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("requires exactly one start node", () => {
    const graph = baseGraph();
    graph.nodes[1] = { ...graph.nodes[1], kind: "inicio" };
    const result = validateProtocolGraph(graph);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("inicio"))).toBe(true);
  });

  it("errors when no end is reachable", () => {
    const graph = baseGraph();
    graph.edges = [{ id: "e1", from: "inicio", to: "notificar" }];
    const result = validateProtocolGraph(graph);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.toLowerCase().includes("fin"))).toBe(true);
  });

  it("errors when an edge points to a missing node", () => {
    const graph = baseGraph();
    graph.edges.push({ id: "e9", from: "notificar", to: "fantasma" });
    const result = validateProtocolGraph(graph);
    expect(result.ok).toBe(false);
  });
});

describe("protocol graph compilation", () => {
  it("compiles to a topologically ordered step list carrying transitions", () => {
    const steps = compileProtocolGraph(baseGraph());
    expect(steps.map((step) => step.id)).toEqual(["inicio", "notificar", "fin"]);
    expect(steps[0].next).toEqual(["notificar"]);
    expect(steps.at(-1)?.next).toEqual([]);
  });

  it("round-trips a compiled version back into an editable graph", () => {
    const compiled = compileProtocolGraph(baseGraph());
    const graph = graphFromSteps("proteccion_escolar", "Proteccion escolar", compiled as Array<Record<string, unknown>>);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges.some((edge) => edge.from === "inicio" && edge.to === "notificar")).toBe(true);
    expect(validateProtocolGraph(graph).ok).toBe(true);
  });

  it("reconstructs legacy linear steps without graph metadata into a chain", () => {
    const legacy = [
      { id: "safety", title: "Confirmar seguridad", dueMinute: 5, requiredEvidence: true },
      { id: "notify", title: "Notificar", dueMinute: 10, requiredEvidence: true },
      { id: "decision", title: "Decision", dueMinute: 30, requiredEvidence: true }
    ];
    const graph = graphFromSteps("legacy", "Legacy", legacy);
    expect(graph.nodes[0].kind).toBe("inicio");
    expect(graph.nodes.at(-1)?.kind).toBe("fin");
    expect(graph.edges).toHaveLength(2);
  });
});
