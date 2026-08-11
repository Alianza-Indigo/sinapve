"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, Link2, ListOrdered, Play, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import {
  compileProtocolGraph,
  simulateProtocolGraph,
  validateProtocolGraph,
  type ProtocolEdge,
  type ProtocolGraph,
  type ProtocolNode,
  type ProtocolNodeKind
} from "@sinapve/domain/protocol-graph";

const NODE_W = 190;
const NODE_H = 70;
const VIEW_W = 1040;
const VIEW_H = 680;
const MOVE_STEP = 10;

const KIND_LABEL: Record<ProtocolNodeKind, string> = { inicio: "Inicio", accion: "Accion", decision: "Decision", fin: "Fin" };
const KIND_FILL: Record<ProtocolNodeKind, string> = { inicio: "#0f766e", accion: "#1d4ed8", decision: "#b45309", fin: "#6d28d9" };
const ROLE_OPTIONS = ["", "APVE", "SCHOOL_DIRECTOR", "UEPE", "EMIR", "PRIVACY_OFFICER", "TECH_ADMIN"] as const;

function newId(prefix: string) {
  return `${prefix}_${Math.round(performance.now() * 1000).toString(36)}`;
}

function defaultGraph(): ProtocolGraph {
  const inicio: ProtocolNode = { id: "inicio", kind: "inicio", title: "Confirmar seguridad inmediata", dueMinute: 5, requiredEvidence: true, x: 120, y: 90 };
  const fin: ProtocolNode = { id: "fin", kind: "fin", title: "Documentar decision y cierre", dueMinute: 30, requiredEvidence: true, x: 120, y: 430 };
  return { code: "protocolo_nuevo", title: "Protocolo nuevo", nodes: [inicio, fin], edges: [{ id: newId("edge"), from: "inicio", to: "fin" }] };
}

const clampX = (x: number) => Math.max(0, Math.min(VIEW_W - NODE_W, Math.round(x)));
const clampY = (y: number) => Math.max(0, Math.min(VIEW_H - NODE_H, Math.round(y)));

export function ProtocolBuilder({ initialGraph }: { initialGraph?: ProtocolGraph }) {
  const [graph, setGraph] = useState<ProtocolGraph>(() => initialGraph ?? defaultGraph());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [simChoices, setSimChoices] = useState<Record<string, string>>({});

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const validation = useMemo(() => validateProtocolGraph(graph), [graph]);
  const compiled = useMemo(() => compileProtocolGraph(graph), [graph]);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const simulation = useMemo(() => (simOpen ? simulateProtocolGraph(graph, simChoices) : null), [simOpen, graph, simChoices]);

  const toSvgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const local = point.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  };

  const updateNode = (id: string, patch: Partial<ProtocolNode>) => {
    setGraph((prev) => ({ ...prev, nodes: prev.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)) }));
  };

  const addNode = (kind: ProtocolNodeKind) => {
    const id = newId(kind);
    const node: ProtocolNode = {
      id,
      kind,
      title: kind === "decision" ? "Decision" : kind === "fin" ? "Fin" : "Nuevo paso",
      dueMinute: 15,
      requiredEvidence: kind !== "decision",
      x: 480 + (graph.nodes.length % 3) * 40,
      y: 120 + (graph.nodes.length % 5) * 60
    };
    setGraph((prev) => ({ ...prev, nodes: [...prev.nodes, node] }));
    setSelectedNode(id);
    setSelectedEdge(null);
  };

  const removeNode = (id: string) => {
    setGraph((prev) => ({ ...prev, nodes: prev.nodes.filter((node) => node.id !== id), edges: prev.edges.filter((edge) => edge.from !== id && edge.to !== id) }));
    setSelectedNode(null);
  };

  const removeEdge = (id: string) => {
    setGraph((prev) => ({ ...prev, edges: prev.edges.filter((edge) => edge.id !== id) }));
    setSelectedEdge(null);
  };

  const connectTo = (targetId: string) => {
    if (!connectFrom || connectFrom === targetId) {
      setConnectFrom(null);
      return;
    }
    if (!graph.edges.some((edge) => edge.from === connectFrom && edge.to === targetId)) {
      const edge: ProtocolEdge = { id: newId("edge"), from: connectFrom, to: targetId };
      setGraph((prev) => ({ ...prev, edges: [...prev.edges, edge] }));
    }
    setConnectFrom(null);
  };

  const onNodePointerDown = (event: React.PointerEvent, node: ProtocolNode) => {
    event.stopPropagation();
    setSelectedNode(node.id);
    setSelectedEdge(null);
    if (connectFrom) {
      connectTo(node.id);
      return;
    }
    const point = toSvgPoint(event.clientX, event.clientY);
    dragRef.current = { id: node.id, dx: point.x - node.x, dy: point.y - node.y };
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  const onCanvasPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = toSvgPoint(event.clientX, event.clientY);
    updateNode(drag.id, { x: clampX(point.x - drag.dx), y: clampY(point.y - drag.dy) });
  };

  // Accesibilidad por teclado del lienzo: mover con flechas, conectar con "c",
  // confirmar destino con Enter, eliminar con Supr, cancelar con Escape.
  const onNodeKeyDown = (event: React.KeyboardEvent, node: ProtocolNode) => {
    switch (event.key) {
      case "ArrowUp":
        updateNode(node.id, { y: clampY(node.y - MOVE_STEP) });
        event.preventDefault();
        break;
      case "ArrowDown":
        updateNode(node.id, { y: clampY(node.y + MOVE_STEP) });
        event.preventDefault();
        break;
      case "ArrowLeft":
        updateNode(node.id, { x: clampX(node.x - MOVE_STEP) });
        event.preventDefault();
        break;
      case "ArrowRight":
        updateNode(node.id, { x: clampX(node.x + MOVE_STEP) });
        event.preventDefault();
        break;
      case "Delete":
      case "Backspace":
        removeNode(node.id);
        event.preventDefault();
        break;
      case "c":
      case "C":
        if (node.kind !== "fin") setConnectFrom(node.id);
        break;
      case "Enter":
      case " ":
        if (connectFrom && connectFrom !== node.id) connectTo(node.id);
        else setSelectedNode(node.id);
        event.preventDefault();
        break;
      case "Escape":
        setConnectFrom(null);
        break;
      default:
        break;
    }
  };

  const publish = async () => {
    setMessage(null);
    if (!validation.ok) {
      setMessage({ kind: "error", text: "Corrige los errores antes de publicar." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/protocols/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph })
      });
      const data = (await res.json().catch(() => ({}))) as { version?: { version: number }; issues?: string[]; message?: string };
      if (!res.ok) {
        setMessage({ kind: "error", text: data.issues?.join(" · ") ?? data.message ?? `Error ${res.status}` });
        return;
      }
      setMessage({ kind: "ok", text: `Publicado como borrador ${graph.code} v${data.version?.version ?? "?"}. Apruébalo en la lista para activarlo.` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Fallo de red" });
    } finally {
      setSaving(false);
    }
  };

  const selected = selectedNode ? nodeById.get(selectedNode) ?? null : null;
  const selectedEdgeObj = selectedEdge ? graph.edges.find((edge) => edge.id === selectedEdge) ?? null : null;

  return (
    <div className="protocol-builder" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: "1rem", alignItems: "start" }}>
      <div>
        <div className="toolbar" style={{ gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          <button type="button" className="button" onClick={() => addNode("accion")}><Plus size={16} aria-hidden="true" /> Paso</button>
          <button type="button" className="button" onClick={() => addNode("decision")}><Plus size={16} aria-hidden="true" /> Decision</button>
          <button type="button" className="button" onClick={() => addNode("fin")}><Plus size={16} aria-hidden="true" /> Fin</button>
          <button type="button" className={`button${showPreview ? " primary" : ""}`} onClick={() => setShowPreview((value) => !value)} aria-pressed={showPreview}>
            <ListOrdered size={16} aria-hidden="true" /> Vista compilada
          </button>
          <button type="button" className={`button${simOpen ? " primary" : ""}`} onClick={() => { setSimOpen((value) => !value); setSimChoices({}); }} aria-pressed={simOpen}>
            <FlaskConical size={16} aria-hidden="true" /> Simular
          </button>
          <button type="button" className="button primary" onClick={publish} disabled={saving || !validation.ok}>
            <Save size={16} aria-hidden="true" /> {saving ? "Publicando..." : "Publicar borrador"}
          </button>
        </div>

        <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>
          Teclado: Tab enfoca un paso; flechas lo mueven; <kbd>c</kbd> inicia una transición y <kbd>Enter</kbd> en el destino la crea; <kbd>Supr</kbd> elimina; <kbd>Esc</kbd> cancela.
        </p>

        {connectFrom ? (
          <p className="muted" role="status" style={{ marginBottom: "0.5rem" }}>
            Conectando desde <strong>{nodeById.get(connectFrom)?.title}</strong>: elige el paso destino (clic o Enter) o pulsa Escape.
          </p>
        ) : null}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="application"
          aria-label="Lienzo del constructor de protocolos"
          style={{ width: "100%", height: "auto", border: "1px solid rgba(148,163,184,0.35)", borderRadius: "12px", background: "rgba(15,23,42,0.03)", touchAction: "none" }}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerDown={() => { setSelectedNode(null); setSelectedEdge(null); setConnectFrom(null); }}
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>
          </defs>

          {graph.edges.map((edge) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to) return null;
            const x1 = from.x + NODE_W / 2;
            const y1 = from.y + NODE_H;
            const x2 = to.x + NODE_W / 2;
            const y2 = to.y;
            const midY = (y1 + y2) / 2;
            const active = edge.id === selectedEdge;
            return (
              <g key={edge.id} style={{ cursor: "pointer" }} onPointerDown={(event) => { event.stopPropagation(); setSelectedEdge(edge.id); setSelectedNode(null); }}>
                <path d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`} fill="none" stroke={active ? "#0f766e" : "#64748b"} strokeWidth={active ? 3 : 2} markerEnd="url(#arrow)" />
                {edge.condition ? <text x={(x1 + x2) / 2} y={midY - 6} textAnchor="middle" fontSize="12" fill="#334155">{edge.condition}</text> : null}
              </g>
            );
          })}

          {graph.nodes.map((node) => {
            const isSelected = node.id === selectedNode;
            const isConnectSource = node.id === connectFrom;
            const onPath = simulation?.path.includes(node.id);
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                style={{ cursor: "grab" }}
                tabIndex={0}
                role="button"
                aria-label={`${KIND_LABEL[node.kind]}: ${node.title}. T+${node.dueMinute} min. Flechas mueven, c conecta, Supr elimina.`}
                onFocus={() => { setSelectedNode(node.id); setSelectedEdge(null); }}
                onKeyDown={(event) => onNodeKeyDown(event, node)}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  fill={onPath ? "#ecfdf5" : "#ffffff"}
                  stroke={isSelected || isConnectSource ? KIND_FILL[node.kind] : onPath ? "#0f766e" : "rgba(148,163,184,0.6)"}
                  strokeWidth={isSelected || isConnectSource ? 3 : 1.5}
                  onPointerDown={(event) => onNodePointerDown(event, node)}
                />
                <rect width={NODE_W} height={22} rx={12} fill={KIND_FILL[node.kind]} onPointerDown={(event) => onNodePointerDown(event, node)} />
                <text x={10} y={15} fontSize="11" fill="#ffffff" style={{ pointerEvents: "none" }}>{KIND_LABEL[node.kind]} · T+{node.dueMinute}m</text>
                <text x={10} y={44} fontSize="13" fill="#0f172a" style={{ pointerEvents: "none" }}>{node.title.length > 26 ? `${node.title.slice(0, 25)}…` : node.title}</text>
                <text x={10} y={61} fontSize="10.5" fill="#475569" style={{ pointerEvents: "none" }}>
                  {node.requiredEvidence ? "Evidencia requerida" : "Evidencia opcional"}{node.ownerRole ? ` · ${node.ownerRole}` : ""}
                </text>
                {node.kind !== "fin" ? (
                  <circle
                    cx={NODE_W - 14}
                    cy={NODE_H - 14}
                    r={9}
                    fill={isConnectSource ? "#0f766e" : "#e2e8f0"}
                    stroke="#0f766e"
                    strokeWidth={1.5}
                    style={{ cursor: "crosshair" }}
                    onPointerDown={(event) => { event.stopPropagation(); setConnectFrom(node.id); setSelectedNode(node.id); }}
                  >
                    <title>Arrastrar transicion desde este paso</title>
                  </circle>
                ) : null}
              </g>
            );
          })}
        </svg>

        <div className="status-row" style={{ marginTop: "0.75rem", flexWrap: "wrap" }}>
          {validation.ok ? (
            <span className="status-pill safe"><CheckCircle2 size={14} aria-hidden="true" /> Grafo valido</span>
          ) : (
            <span className="status-pill critical"><AlertTriangle size={14} aria-hidden="true" /> {validation.errors.length} error(es)</span>
          )}
          {validation.warnings.length > 0 ? <span className="status-pill"><AlertTriangle size={14} aria-hidden="true" /> {validation.warnings.length} advertencia(s)</span> : null}
          {message ? <span className={`status-pill ${message.kind === "ok" ? "safe" : "critical"}`}>{message.text}</span> : null}
        </div>
        {validation.errors.length > 0 || validation.warnings.length > 0 ? (
          <ul className="muted" style={{ marginTop: "0.5rem", fontSize: "0.85rem", lineHeight: 1.5 }}>
            {validation.errors.map((error) => <li key={error} style={{ color: "#b91c1c" }}>✕ {error}</li>)}
            {validation.warnings.map((warning) => <li key={warning}>⚠ {warning}</li>)}
          </ul>
        ) : null}

        {showPreview ? (
          <section className="panel" style={{ marginTop: "0.75rem" }}>
            <p className="eyebrow">Ruta compilada</p>
            <p className="muted" style={{ fontSize: "0.85rem" }}>Orden lineal que ejecutarán las corridas (orden topológico por dependencia y vencimiento).</p>
            <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem", fontSize: "0.88rem", lineHeight: 1.6 }}>
              {compiled.map((step) => (
                <li key={step.id}>
                  <strong>{step.title}</strong> · {KIND_LABEL[step.kind]} · T+{step.dueMinute}m
                  {step.next.length > 0 ? <span className="muted"> → {step.next.map((t) => nodeById.get(t.to)?.title ?? t.to).join(", ")}</span> : <span className="muted"> (fin)</span>}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {simOpen && simulation ? (
          <section className="panel" style={{ marginTop: "0.75rem" }}>
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <p className="eyebrow" style={{ margin: 0 }}><Play size={13} aria-hidden="true" style={{ verticalAlign: "middle" }} /> Simulación</p>
              <button type="button" className="button" onClick={() => setSimChoices({})}><RotateCcw size={13} aria-hidden="true" /> Reiniciar</button>
            </div>
            <ol style={{ margin: "0.5rem 0", paddingLeft: "1.2rem", fontSize: "0.88rem", lineHeight: 1.6 }}>
              {simulation.path.map((id) => <li key={id}>{nodeById.get(id)?.title ?? id}</li>)}
            </ol>
            {simulation.awaiting ? (
              <div>
                <p className="muted" style={{ fontSize: "0.85rem" }}>Decisión en <strong>{simulation.awaiting.title}</strong>: elige rama</p>
                <div className="status-row" style={{ flexWrap: "wrap", gap: 6 }}>
                  {simulation.awaiting.options.map((option) => (
                    <button key={option.to} type="button" className="button" onClick={() => setSimChoices((prev) => ({ ...prev, [simulation.awaiting!.stepId]: option.to }))}>
                      {option.condition ?? nodeById.get(option.to)?.title ?? option.to}
                    </button>
                  ))}
                </div>
              </div>
            ) : simulation.done ? (
              <span className="status-pill safe"><CheckCircle2 size={13} aria-hidden="true" /> Simulación completada</span>
            ) : (
              <span className="status-pill">Ruta detenida (revisa el grafo)</span>
            )}
          </section>
        ) : null}
      </div>

      <aside className="panel" style={{ position: "sticky", top: "1rem" }}>
        <p className="eyebrow">Protocolo</p>
        <label className="field-label" htmlFor="pb-code">Codigo</label>
        <input id="pb-code" className="input" value={graph.code} onChange={(event) => setGraph((prev) => ({ ...prev, code: event.target.value }))} />
        <label className="field-label" htmlFor="pb-title" style={{ marginTop: "0.5rem" }}>Titulo</label>
        <input id="pb-title" className="input" value={graph.title} onChange={(event) => setGraph((prev) => ({ ...prev, title: event.target.value }))} />

        <hr style={{ margin: "1rem 0", border: "none", borderTop: "1px solid rgba(148,163,184,0.3)" }} />

        {selected ? (
          <div>
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <p className="eyebrow" style={{ margin: 0 }}>Paso seleccionado</p>
              <button type="button" className="button" onClick={() => removeNode(selected.id)} aria-label="Eliminar paso"><Trash2 size={14} aria-hidden="true" /></button>
            </div>
            <label className="field-label" htmlFor="pb-node-title">Titulo</label>
            <input id="pb-node-title" className="input" value={selected.title} onChange={(event) => updateNode(selected.id, { title: event.target.value })} />
            <label className="field-label" htmlFor="pb-node-kind" style={{ marginTop: "0.5rem" }}>Tipo</label>
            <select id="pb-node-kind" className="input" value={selected.kind} onChange={(event) => updateNode(selected.id, { kind: event.target.value as ProtocolNodeKind })}>
              {(Object.keys(KIND_LABEL) as ProtocolNodeKind[]).map((kind) => <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>)}
            </select>
            <label className="field-label" htmlFor="pb-node-due" style={{ marginTop: "0.5rem" }}>Vencimiento (min)</label>
            <input id="pb-node-due" className="input" type="number" min={0} value={selected.dueMinute} onChange={(event) => updateNode(selected.id, { dueMinute: Number(event.target.value) || 0 })} />
            <label className="field-label" htmlFor="pb-node-owner" style={{ marginTop: "0.5rem" }}>Responsable</label>
            <select id="pb-node-owner" className="input" value={selected.ownerRole ?? ""} onChange={(event) => updateNode(selected.id, { ownerRole: event.target.value ? (event.target.value as ProtocolNode["ownerRole"]) : undefined })}>
              {ROLE_OPTIONS.map((role) => <option key={role || "none"} value={role}>{role || "Sin asignar"}</option>)}
            </select>
            <label className="status-pill" style={{ marginTop: "0.6rem", gap: "0.4rem" }}>
              <input type="checkbox" checked={selected.requiredEvidence} onChange={(event) => updateNode(selected.id, { requiredEvidence: event.target.checked })} /> Evidencia requerida
            </label>
            <button type="button" className="button" style={{ marginTop: "0.6rem", width: "100%" }} onClick={() => setConnectFrom(selected.id)}>
              <Link2 size={14} aria-hidden="true" /> Conectar a otro paso
            </button>
          </div>
        ) : selectedEdgeObj ? (
          <div>
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <p className="eyebrow" style={{ margin: 0 }}>Transicion</p>
              <button type="button" className="button" onClick={() => removeEdge(selectedEdgeObj.id)} aria-label="Eliminar transicion"><Trash2 size={14} aria-hidden="true" /></button>
            </div>
            <p className="muted" style={{ fontSize: "0.85rem" }}>{nodeById.get(selectedEdgeObj.from)?.title} → {nodeById.get(selectedEdgeObj.to)?.title}</p>
            <label className="field-label" htmlFor="pb-edge-cond">Condicion (para decisiones)</label>
            <input
              id="pb-edge-cond"
              className="input"
              value={selectedEdgeObj.condition ?? ""}
              placeholder="p. ej. riesgo alto"
              onChange={(event) => setGraph((prev) => ({ ...prev, edges: prev.edges.map((edge) => (edge.id === selectedEdgeObj.id ? { ...edge, condition: event.target.value || undefined } : edge)) }))}
            />
          </div>
        ) : (
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            Selecciona un paso o transicion para editar. Usa el punto inferior derecho de un paso para dibujar una transicion, o el boton
            <X size={12} aria-hidden="true" style={{ verticalAlign: "middle" }} /> del lienzo para deseleccionar.
          </p>
        )}
      </aside>
    </div>
  );
}
