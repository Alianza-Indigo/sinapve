import { describe, expect, it } from "vitest";
import {
  compileProtocolGraph,
  deriveProtocolRunState,
  graphFromSteps,
  validateBranchChoice,
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
    expect(steps[0].next).toEqual([{ to: "notificar" }]);
    expect(steps.at(-1)?.next).toEqual([]);
  });

  it("round-trips a compiled version back into an editable graph", () => {
    const compiled = compileProtocolGraph(baseGraph());
    const graph = graphFromSteps("proteccion_escolar", "Proteccion escolar", compiled as Array<Record<string, unknown>>);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges.some((edge) => edge.from === "inicio" && edge.to === "notificar")).toBe(true);
    expect(validateProtocolGraph(graph).ok).toBe(true);
  });

  it("reconstructs new transition objects with conditions on round-trip", () => {
    const graph = baseGraph();
    graph.edges[0] = { ...graph.edges[0], condition: "riesgo alto" };
    const compiled = compileProtocolGraph(graph);
    expect(compiled[0].next[0]).toEqual({ to: "notificar", condition: "riesgo alto" });
    const back = graphFromSteps(graph.code, graph.title, compiled as Array<Record<string, unknown>>);
    expect(back.edges.find((edge) => edge.from === "inicio")?.condition).toBe("riesgo alto");
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

function decisionGraph(): ProtocolGraph {
  return {
    code: "ruta_decision",
    title: "Ruta con decision",
    nodes: [
      { id: "inicio", kind: "inicio", title: "Inicio", dueMinute: 0, requiredEvidence: false, x: 0, y: 0 },
      { id: "decidir", kind: "decision", title: "Evaluar riesgo", dueMinute: 5, requiredEvidence: false, x: 0, y: 100 },
      { id: "grave", kind: "accion", title: "Escalar a EMIR", dueMinute: 10, requiredEvidence: true, x: 0, y: 200 },
      { id: "leve", kind: "accion", title: "Seguimiento escolar", dueMinute: 10, requiredEvidence: false, x: 200, y: 200 },
      { id: "fin", kind: "fin", title: "Cierre", dueMinute: 30, requiredEvidence: true, x: 0, y: 300 }
    ],
    edges: [
      { id: "e1", from: "inicio", to: "decidir" },
      { id: "e2", from: "decidir", to: "grave", condition: "riesgo grave" },
      { id: "e3", from: "decidir", to: "leve", condition: "riesgo leve" },
      { id: "e4", from: "grave", to: "fin" },
      { id: "e5", from: "leve", to: "fin" }
    ]
  };
}

describe("protocol run engine (branch-by-branch)", () => {
  const steps = compileProtocolGraph(decisionGraph());

  it("starts with the inicio step active and the rest pending", () => {
    const state = deriveProtocolRunState(steps, []);
    expect(state.activeStepId).toBe("inicio");
    expect(state.status).toBe("activo");
    expect(state.steps.find((step) => step.id === "fin")?.status).toBe("pendiente");
  });

  it("surfaces branches when a decision becomes active", () => {
    const state = deriveProtocolRunState(steps, [{ stepId: "inicio", status: "completado" }]);
    expect(state.activeStepId).toBe("decidir");
    expect(state.branches.map((branch) => branch.to).sort()).toEqual(["grave", "leve"]);
  });

  it("does not advance past a decision without a chosen branch", () => {
    const state = deriveProtocolRunState(steps, [
      { stepId: "inicio", status: "completado" },
      { stepId: "decidir", status: "completado" }
    ]);
    expect(state.activeStepId).toBe("decidir");
    expect(validateBranchChoice(steps.find((step) => step.id === "decidir")!, undefined).ok).toBe(false);
  });

  it("follows the chosen branch and skips the other", () => {
    const state = deriveProtocolRunState(steps, [
      { stepId: "inicio", status: "completado" },
      { stepId: "decidir", status: "completado", chosenNext: "grave" }
    ]);
    expect(state.activeStepId).toBe("grave");
    expect(state.steps.find((step) => step.id === "leve")?.status).toBe("omitido");
    expect(validateBranchChoice(steps.find((step) => step.id === "decidir")!, "grave").ok).toBe(true);
  });

  it("completes when the taken branch reaches an end", () => {
    const state = deriveProtocolRunState(steps, [
      { stepId: "inicio", status: "completado" },
      { stepId: "decidir", status: "completado", chosenNext: "leve" },
      { stepId: "leve", status: "completado" },
      { stepId: "fin", status: "completado" }
    ]);
    expect(state.status).toBe("completado");
    expect(state.activeStepId).toBeNull();
    expect(state.steps.find((step) => step.id === "grave")?.status).toBe("omitido");
  });

  it("marks the run blocked when a step is blocked", () => {
    const state = deriveProtocolRunState(steps, [
      { stepId: "inicio", status: "completado" },
      { stepId: "decidir", status: "completado", chosenNext: "grave" },
      { stepId: "grave", status: "bloqueado" }
    ]);
    expect(state.status).toBe("bloqueado");
    expect(state.steps.find((step) => step.id === "grave")?.status).toBe("bloqueado");
  });

  it("rejects an invalid branch choice", () => {
    const decidir = steps.find((step) => step.id === "decidir")!;
    expect(validateBranchChoice(decidir, "inexistente").ok).toBe(false);
  });
});
