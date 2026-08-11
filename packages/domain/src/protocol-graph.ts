import { z } from "zod";
import type { ProtocolStep, Role } from "./types";

// EP-04 / 7.x: constructor visual de protocolos. Un protocolo se modela como un
// grafo dirigido aciclico (DAG) de nodos (pasos) y aristas (transiciones). El
// grafo se valida en cliente y servidor con las mismas reglas puras de este
// modulo y se compila a la lista lineal `steps[]` que ya consumen las corridas
// (`protocol_runs`) y el `ProtocolStepper`, de modo que el editor es
// retrocompatible y no requiere migracion de esquema.

export type ProtocolNodeKind = "inicio" | "accion" | "decision" | "fin";

export type ProtocolNode = {
  id: string;
  kind: ProtocolNodeKind;
  title: string;
  dueMinute: number;
  requiredEvidence: boolean;
  ownerRole?: Role;
  x: number;
  y: number;
};

export type ProtocolEdge = {
  id: string;
  from: string;
  to: string;
  condition?: string;
};

export type ProtocolGraph = {
  code: string;
  title: string;
  nodes: ProtocolNode[];
  edges: ProtocolEdge[];
};

export type ProtocolGraphValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

// Roles validos para responsable de un paso (subconjunto operativo de Role).
const roleValues: Role[] = [
  "SUPER_ADMIN",
  "APVE",
  "SCHOOL_DIRECTOR",
  "UEPE",
  "EMIR",
  "FEDERAL",
  "AUDITOR",
  "PRIVACY_OFFICER",
  "TECH_ADMIN"
];

export const protocolNodeSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-zA-Z0-9_-]+$/, "id de nodo invalido"),
  kind: z.enum(["inicio", "accion", "decision", "fin"]),
  title: z.string().min(1).max(160),
  dueMinute: z.number().int().min(0).max(100_000),
  requiredEvidence: z.boolean(),
  ownerRole: z.enum(roleValues as [Role, ...Role[]]).optional(),
  x: z.number().finite(),
  y: z.number().finite()
});

export const protocolEdgeSchema = z.object({
  id: z.string().min(1).max(80),
  from: z.string().min(1),
  to: z.string().min(1),
  condition: z.string().max(120).optional()
});

export const protocolGraphSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_]*$/, "el codigo usa minusculas, digitos y guion bajo"),
  title: z.string().min(3).max(160),
  nodes: z.array(protocolNodeSchema).min(2).max(100),
  edges: z.array(protocolEdgeSchema).max(400)
});

// Deteccion de ciclos por DFS con marca de tres estados.
function hasCycle(nodeIds: string[], adjacency: Map<string, string[]>): boolean {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>(nodeIds.map((id) => [id, WHITE]));

  const visit = (id: string): boolean => {
    color.set(id, GRAY);
    for (const next of adjacency.get(id) ?? []) {
      const c = color.get(next);
      if (c === GRAY) return true;
      if (c === WHITE && visit(next)) return true;
    }
    color.set(id, BLACK);
    return false;
  };

  for (const id of nodeIds) {
    if (color.get(id) === WHITE && visit(id)) return true;
  }
  return false;
}

// Nodos alcanzables desde el nodo de inicio (BFS).
function reachableFrom(startId: string, adjacency: Map<string, string[]>): Set<string> {
  const seen = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

// Valida un grafo de protocolo. Errores impiden publicar; advertencias no.
export function validateProtocolGraph(graph: ProtocolGraph): ProtocolGraphValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const shape = protocolGraphSchema.safeParse(graph);
  if (!shape.success) {
    for (const issue of shape.error.issues) {
      errors.push(`${issue.path.join(".") || "grafo"}: ${issue.message}`);
    }
    // Sin forma valida no tiene sentido seguir con las reglas semanticas.
    return { ok: false, errors, warnings };
  }

  const nodeIds = graph.nodes.map((node) => node.id);
  const idSet = new Set(nodeIds);

  if (idSet.size !== nodeIds.length) {
    errors.push("Hay identificadores de nodo duplicados.");
  }

  const starts = graph.nodes.filter((node) => node.kind === "inicio");
  if (starts.length === 0) errors.push("Falta un nodo de inicio.");
  if (starts.length > 1) errors.push("Solo puede existir un nodo de inicio.");

  const ends = graph.nodes.filter((node) => node.kind === "fin");
  if (ends.length === 0) errors.push("Falta al menos un nodo de fin.");

  // Aristas: referencias validas, sin bucles propios ni duplicados.
  const seenEdge = new Set<string>();
  const adjacency = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  const indegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));

  for (const edge of graph.edges) {
    if (!idSet.has(edge.from) || !idSet.has(edge.to)) {
      errors.push(`La transicion ${edge.id} apunta a un nodo inexistente.`);
      continue;
    }
    if (edge.from === edge.to) {
      errors.push(`La transicion ${edge.id} conecta un nodo consigo mismo.`);
      continue;
    }
    const key = `${edge.from}->${edge.to}`;
    if (seenEdge.has(key)) {
      warnings.push(`Transicion duplicada entre ${edge.from} y ${edge.to}.`);
      continue;
    }
    seenEdge.add(key);
    adjacency.get(edge.from)?.push(edge.to);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }

  if (errors.length === 0 && hasCycle(nodeIds, adjacency)) {
    errors.push("El protocolo tiene un ciclo: los pasos no pueden formar bucles.");
  }

  // Reglas por tipo de nodo.
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  for (const node of graph.nodes) {
    const out = adjacency.get(node.id) ?? [];
    const incoming = indegree.get(node.id) ?? 0;
    if (node.kind === "inicio" && incoming > 0) {
      errors.push(`El nodo de inicio "${node.title}" no puede recibir transiciones.`);
    }
    if (node.kind === "fin" && out.length > 0) {
      errors.push(`El nodo de fin "${node.title}" no puede tener transiciones de salida.`);
    }
    if (node.kind !== "fin" && out.length === 0) {
      warnings.push(`El paso "${node.title}" no tiene salida y no es un fin.`);
    }
    if (node.kind === "decision" && out.length < 2) {
      warnings.push(`La decision "${node.title}" deberia tener al menos dos ramas.`);
    }
    // Monotonia temporal: un sucesor no deberia vencer antes que su predecesor.
    for (const nextId of out) {
      const next = byId.get(nextId);
      if (next && next.kind !== "fin" && next.dueMinute < node.dueMinute) {
        warnings.push(`"${next.title}" vence antes (T+${next.dueMinute}) que "${node.title}" (T+${node.dueMinute}).`);
      }
    }
  }

  // Alcanzabilidad desde el inicio (solo si hay exactamente un inicio).
  if (starts.length === 1 && errors.length === 0) {
    const reachable = reachableFrom(starts[0].id, adjacency);
    for (const node of graph.nodes) {
      if (!reachable.has(node.id)) {
        warnings.push(`El paso "${node.title}" no es alcanzable desde el inicio.`);
      }
    }
    const reachesEnd = ends.some((end) => reachable.has(end.id));
    if (!reachesEnd) {
      errors.push("Ningun nodo de fin es alcanzable desde el inicio.");
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

// Orden topologico (Kahn) con desempate por dueMinute y luego titulo, para que la
// lista lineal resultante sea estable y legible.
function topologicalOrder(graph: ProtocolGraph): ProtocolNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, string[]>(graph.nodes.map((node) => [node.id, []]));
  const indegree = new Map<string, number>(graph.nodes.map((node) => [node.id, 0]));
  const seenEdge = new Set<string>();
  for (const edge of graph.edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to) || edge.from === edge.to) continue;
    const key = `${edge.from}->${edge.to}`;
    if (seenEdge.has(key)) continue;
    seenEdge.add(key);
    adjacency.get(edge.from)?.push(edge.to);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }

  const pick = (ids: string[]): string => {
    let best = ids[0];
    for (const id of ids) {
      const a = byId.get(id) as ProtocolNode;
      const b = byId.get(best) as ProtocolNode;
      if (a.dueMinute < b.dueMinute || (a.dueMinute === b.dueMinute && a.title.localeCompare(b.title) < 0)) {
        best = id;
      }
    }
    return best;
  };

  const ready = graph.nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
  const ordered: ProtocolNode[] = [];
  const remaining = new Set(ready);
  while (remaining.size > 0) {
    const id = pick([...remaining]);
    remaining.delete(id);
    ordered.push(byId.get(id) as ProtocolNode);
    for (const next of adjacency.get(id) ?? []) {
      indegree.set(next, (indegree.get(next) ?? 0) - 1);
      if ((indegree.get(next) ?? 0) === 0) remaining.add(next);
    }
  }

  // Si quedaron nodos (ciclo), se anexan al final para no perderlos.
  if (ordered.length < graph.nodes.length) {
    const placed = new Set(ordered.map((node) => node.id));
    for (const node of graph.nodes) {
      if (!placed.has(node.id)) ordered.push(node);
    }
  }
  return ordered;
}

// Transicion compilada: destino + condicion opcional (etiqueta de rama de una
// decision). Conservar la condicion permite ejecutar el protocolo rama por rama.
export type ProtocolTransition = { to: string; condition?: string };

// Paso compilado: superconjunto de ProtocolStep que ademas conserva la topologia
// del grafo (kind, coordenadas, transiciones) para poder reabrir el editor y
// ejecutar el protocolo con ramificacion condicional.
export type CompiledProtocolStep = {
  id: string;
  title: string;
  dueMinute: number;
  requiredEvidence: boolean;
  ownerRole?: Role;
  kind: ProtocolNodeKind;
  x: number;
  y: number;
  next: ProtocolTransition[];
};

// Compila el grafo a la lista lineal que persiste `protocol_versions.steps`.
export function compileProtocolGraph(graph: ProtocolGraph): CompiledProtocolStep[] {
  const adjacency = new Map<string, ProtocolTransition[]>(graph.nodes.map((node) => [node.id, []]));
  const seenEdge = new Set<string>();
  for (const edge of graph.edges) {
    const key = `${edge.from}->${edge.to}`;
    if (seenEdge.has(key) || edge.from === edge.to) continue;
    seenEdge.add(key);
    adjacency.get(edge.from)?.push({ to: edge.to, ...(edge.condition ? { condition: edge.condition } : {}) });
  }
  return topologicalOrder(graph).map((node) => ({
    id: node.id,
    title: node.title,
    dueMinute: node.dueMinute,
    requiredEvidence: node.requiredEvidence,
    ...(node.ownerRole ? { ownerRole: node.ownerRole } : {}),
    kind: node.kind,
    x: node.x,
    y: node.y,
    next: adjacency.get(node.id) ?? []
  }));
}

// Normaliza pasos persistidos (jsonb) a CompiledProtocolStep, tolerando tanto el
// formato nuevo (`next` como transiciones) como el heredado (`next` como ids o
// pasos lineales sin `next`).
export function normalizeStoredSteps(raw: Array<Record<string, unknown>>): CompiledProtocolStep[] {
  return raw.map((step, index) => {
    const rawNext = step.next;
    let next: ProtocolTransition[] = [];
    if (Array.isArray(rawNext)) {
      next = rawNext
        .map((value) => {
          if (typeof value === "string") return { to: value } as ProtocolTransition;
          if (value && typeof value === "object" && typeof (value as { to?: unknown }).to === "string") {
            const cond = (value as { condition?: unknown }).condition;
            return { to: (value as { to: string }).to, ...(typeof cond === "string" ? { condition: cond } : {}) } as ProtocolTransition;
          }
          return null;
        })
        .filter((value): value is ProtocolTransition => value !== null);
    }
    const id = typeof step.id === "string" && step.id ? step.id : `paso_${index + 1}`;
    const kind = (step.kind as ProtocolNodeKind) ?? (index === 0 ? "inicio" : index === raw.length - 1 ? "fin" : "accion");
    return {
      id,
      title: typeof step.title === "string" ? step.title : id,
      dueMinute: typeof step.dueMinute === "number" ? step.dueMinute : index * 5,
      requiredEvidence: Boolean(step.requiredEvidence),
      ...(typeof step.ownerRole === "string" ? { ownerRole: step.ownerRole as Role } : {}),
      kind,
      x: typeof step.x === "number" ? step.x : 120,
      y: typeof step.y === "number" ? step.y : 80 + index * 120,
      next
    };
  });
}

// Los pasos compilados siguen siendo ProtocolStep validos para el stepper lineal
// (status se inyecta en la corrida, aqui se marca "pendiente").
export function compiledToRunSteps(steps: CompiledProtocolStep[]): ProtocolStep[] {
  return steps.map((step, index) => ({
    id: step.id,
    title: step.title,
    dueMinute: step.dueMinute,
    requiredEvidence: step.requiredEvidence,
    status: index === 0 ? "en_progreso" : "pendiente"
  }));
}

// Simulación de una corrida contra el grafo (sin persistencia): recorre desde el
// inicio siguiendo la única transición de cada paso lineal y, en cada decisión,
// la rama elegida en `choices` (id del paso destino). Si una decisión aún no
// tiene rama elegida, se detiene y la reporta en `awaiting`.
export type ProtocolSimulationState = {
  steps: CompiledProtocolStep[];
  path: string[];
  awaiting: { stepId: string; title: string; options: ProtocolTransition[] } | null;
  done: boolean;
};

export function simulateProtocolGraph(graph: ProtocolGraph, choices: Record<string, string> = {}): ProtocolSimulationState {
  const steps = compileProtocolGraph(graph);
  const byId = new Map(steps.map((step) => [step.id, step]));
  const start = steps.find((step) => step.kind === "inicio")?.id ?? steps[0]?.id ?? null;

  const path: string[] = [];
  const guard = new Set<string>();
  let current: string | null = start;
  let awaiting: ProtocolSimulationState["awaiting"] = null;
  let done = false;

  while (current && !guard.has(current)) {
    guard.add(current);
    const step = byId.get(current);
    if (!step) break;
    path.push(current);
    if (step.next.length === 0) {
      done = true;
      break;
    }
    if (step.next.length === 1) {
      current = step.next[0].to;
      continue;
    }
    const choice: string | undefined = choices[current];
    if (choice && step.next.some((transition) => transition.to === choice)) {
      current = choice;
      continue;
    }
    awaiting = { stepId: current, title: step.title, options: step.next };
    break;
  }

  return { steps, path, awaiting, done };
}

// Reconstruye un ProtocolGraph a partir de pasos persistidos, para reabrir el
// editor. Tolera pasos "lineales" antiguos sin metadatos de grafo: los ordena en
// una columna y los enlaza en secuencia.
export function graphFromSteps(code: string, title: string, rawSteps: Array<Record<string, unknown>>): ProtocolGraph {
  const steps = normalizeStoredSteps(rawSteps);
  const idSet = new Set(steps.map((step) => step.id));
  const nodes: ProtocolNode[] = steps.map(({ next: _next, ...node }) => node);

  const edges: ProtocolEdge[] = [];
  const seen = new Set<string>();
  const addEdge = (from: string, to: string, condition?: string) => {
    const key = `${from}->${to}`;
    if (seen.has(key) || from === to || !idSet.has(to)) return;
    seen.add(key);
    edges.push({ id: `edge_${edges.length + 1}`, from, to, ...(condition ? { condition } : {}) });
  };

  const anyHasNext = steps.some((step) => step.next.length > 0);
  if (anyHasNext) {
    for (const step of steps) {
      for (const transition of step.next) addEdge(step.id, transition.to, transition.condition);
    }
  } else {
    // Pasos lineales heredados: enlazar en secuencia.
    for (let index = 0; index < steps.length - 1; index += 1) {
      addEdge(steps[index].id, steps[index + 1].id);
    }
  }

  return { code, title, nodes, edges };
}

// ---------------------------------------------------------------------------
// Motor de corridas: ejecucion condicional rama por rama.
// ---------------------------------------------------------------------------

export type ProtocolRunStepStatus = "pendiente" | "en_progreso" | "completado" | "bloqueado" | "omitido";

// Evento de paso tal como se persiste, en orden cronologico (mas antiguo primero).
export type ProtocolRunEvent = {
  stepId: string;
  status: "completado" | "bloqueado";
  chosenNext?: string | null;
};

export type ProtocolRunStepView = {
  id: string;
  title: string;
  dueMinute: number;
  requiredEvidence: boolean;
  ownerRole?: Role;
  kind: ProtocolNodeKind;
  status: ProtocolRunStepStatus;
  transitions: ProtocolTransition[];
};

export type ProtocolRunState = {
  status: "activo" | "completado" | "bloqueado";
  activeStepId: string | null;
  // Ramas que el operador debe elegir para avanzar (solo si el paso activo es una
  // decision con mas de una transicion).
  branches: ProtocolTransition[];
  steps: ProtocolRunStepView[];
};

// Dado un paso, decide que transicion se toma con el evento registrado: para una
// decision con varias ramas exige `chosenNext`; para un paso lineal toma la unica.
function chosenTransition(step: CompiledProtocolStep, event: ProtocolRunEvent | undefined): string | null {
  if (step.next.length === 0) return null;
  if (step.next.length === 1) return step.next[0].to;
  const chosen = event?.chosenNext;
  if (chosen && step.next.some((transition) => transition.to === chosen)) return chosen;
  return null; // decision sin rama elegida -> no avanza
}

// Reduce los pasos compilados + los eventos a un estado de corrida navegable.
// Recorre desde el inicio siguiendo solo las ramas elegidas; los pasos alcanzados
// se marcan completado, el paso detenido en_progreso/bloqueado, lo alcanzable a
// futuro pendiente y lo inalcanzable omitido.
export function deriveProtocolRunState(steps: CompiledProtocolStep[], events: ProtocolRunEvent[]): ProtocolRunState {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const lastEvent = new Map<string, ProtocolRunEvent>();
  for (const event of events) lastEvent.set(event.stepId, event); // el ultimo gana

  const start = steps.find((step) => step.kind === "inicio")?.id ?? steps[0]?.id ?? null;

  const completed = new Set<string>();
  let active: string | null = null;
  let status: ProtocolRunState["status"] = "activo";

  const guard = new Set<string>();
  let current: string | null = start;
  while (current && !guard.has(current)) {
    guard.add(current);
    const step = byId.get(current);
    const event = lastEvent.get(current);
    if (!step || !event) {
      active = current;
      break;
    }
    if (event.status === "bloqueado") {
      active = current;
      status = "bloqueado";
      break;
    }
    // completado
    if (step.next.length === 0) {
      completed.add(current);
      active = null;
      status = "completado";
      break;
    }
    const nextId = chosenTransition(step, event);
    if (!nextId) {
      // Decision completada sin rama valida: sigue activa esperando eleccion.
      active = current;
      break;
    }
    completed.add(current);
    current = nextId;
  }

  // Alcanzables hacia adelante desde el paso activo (respetando ramas ya
  // decididas; en decisiones sin decidir se exploran todas).
  const reachable = new Set<string>();
  if (active) {
    const stack = [active];
    while (stack.length > 0) {
      const id = stack.pop() as string;
      if (reachable.has(id)) continue;
      reachable.add(id);
      const step = byId.get(id);
      if (!step) continue;
      const event = lastEvent.get(id);
      const decided = step.next.length > 1 ? chosenTransition(step, event) : null;
      const follow = decided ? [decided] : step.next.map((transition) => transition.to);
      for (const target of follow) stack.push(target);
    }
  }

  const views: ProtocolRunStepView[] = steps.map((step) => {
    let stepStatus: ProtocolRunStepStatus;
    if (step.id === active) stepStatus = status === "bloqueado" ? "bloqueado" : "en_progreso";
    else if (completed.has(step.id)) stepStatus = "completado";
    else if (reachable.has(step.id)) stepStatus = "pendiente";
    else stepStatus = "omitido";
    return {
      id: step.id,
      title: step.title,
      dueMinute: step.dueMinute,
      requiredEvidence: step.requiredEvidence,
      ...(step.ownerRole ? { ownerRole: step.ownerRole } : {}),
      kind: step.kind,
      status: stepStatus,
      transitions: step.next
    };
  });

  const activeStep = active ? byId.get(active) : undefined;
  const branches = activeStep && activeStep.next.length > 1 ? activeStep.next : [];

  return { status, activeStepId: active, branches, steps: views };
}

// Valida que una eleccion de rama sea legal al completar un paso: las decisiones
// exigen una rama existente; los pasos con una sola salida la ignoran.
export function validateBranchChoice(step: CompiledProtocolStep, chosenNext: string | null | undefined): { ok: boolean; error?: string } {
  if (step.next.length > 1) {
    if (!chosenNext) return { ok: false, error: "Esta decision requiere elegir una rama para avanzar." };
    if (!step.next.some((transition) => transition.to === chosenNext)) {
      return { ok: false, error: "La rama elegida no es una transicion valida de este paso." };
    }
  }
  return { ok: true };
}
