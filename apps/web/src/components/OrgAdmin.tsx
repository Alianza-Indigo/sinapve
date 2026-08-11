"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

type Org = { id: string; name: string; type: string; stateCode?: string | null; municipalityCode?: string | null };

const TYPES: Array<{ value: string; label: string }> = [
  { value: "school", label: "Plantel" },
  { value: "zone", label: "Zona (supervisión)" },
  { value: "municipality", label: "Municipio (CMCE)" },
  { value: "state", label: "Estado (UEPE)" },
  { value: "federal", label: "Federal (UNPVE)" }
];
const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

export function OrgAdmin({ initialOrgs }: { initialOrgs: Org[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("school");
  const [stateCode, setStateCode] = useState("");
  const [municipalityCode, setMunicipalityCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, stateCode: stateCode || undefined, municipalityCode: municipalityCode || undefined })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setMessage({ kind: "error", text: data.message ?? data.error ?? `Error ${res.status}` });
        return;
      }
      setMessage({ kind: "ok", text: `Organización "${name}" creada.` });
      setName("");
      setStateCode("");
      setMunicipalityCode("");
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Fallo de red" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form className="form" onSubmit={create}>
        <div className="form-row">
          <div className="field" style={{ minWidth: 240 }}>
            <label htmlFor="org-name">Nombre</label>
            <input id="org-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="p. ej. Primaria Benito Juárez" />
          </div>
          <div className="field" style={{ minWidth: 200 }}>
            <label htmlFor="org-type">Nivel</label>
            <select id="org-type" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 130 }}>
            <label htmlFor="org-state">Estado (código)</label>
            <input id="org-state" value={stateCode} onChange={(e) => setStateCode(e.target.value)} placeholder="p. ej. JAL" />
          </div>
          <div className="field" style={{ minWidth: 150 }}>
            <label htmlFor="org-mun">Municipio (código)</label>
            <input id="org-mun" value={municipalityCode} onChange={(e) => setMunicipalityCode(e.target.value)} />
          </div>
        </div>
        <div className="status-row">
          <button className="button primary" type="submit" disabled={busy}>
            <Building2 size={16} aria-hidden="true" /> {busy ? "Creando..." : "Crear organización"}
          </button>
          {message ? <span className={`status-pill ${message.kind === "ok" ? "safe" : "critical"}`}>{message.text}</span> : null}
        </div>
      </form>

      <div className="table-wrap" style={{ marginTop: "1.25rem" }}>
        <table>
          <thead>
            <tr>
              <th>Organización</th>
              <th>Nivel</th>
              <th>Estado</th>
              <th>Municipio</th>
            </tr>
          </thead>
          <tbody>
            {initialOrgs.length === 0 ? (
              <tr><td colSpan={4} className="muted">Sin organizaciones todavía. Crea al menos una para poder asignar usuarios.</td></tr>
            ) : (
              initialOrgs.map((org) => (
                <tr key={org.id}>
                  <td><strong>{org.name}</strong><div className="muted" style={{ fontSize: "0.78rem" }}>{org.id}</div></td>
                  <td>{TYPE_LABEL[org.type] ?? org.type}</td>
                  <td className="muted">{org.stateCode ?? "—"}</td>
                  <td className="muted">{org.municipalityCode ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
