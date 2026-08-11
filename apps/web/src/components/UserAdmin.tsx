"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PowerOff, UserPlus, Unlink } from "lucide-react";

type Assignment = { role: string; organization: string; organizationPublicId: string };
type AdminUser = { externalSubject: string; displayName: string; email: string | null; disabled: boolean; assignments: Assignment[] };
type Org = { id: string; name: string; type: string };

const ROLE_OPTIONS = [
  "SCHOOL_DIRECTOR",
  "APVE",
  "SCHOOL_STAFF",
  "UEPE",
  "EMIR",
  "FEDERAL",
  "AUDITOR",
  "PRIVACY_OFFICER",
  "TECH_ADMIN"
];

export function UserAdmin({ initialUsers, organizations }: { initialUsers: AdminUser[]; organizations: Org[] }) {
  const router = useRouter();
  const [externalSubject, setExternalSubject] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationPublicId, setOrganizationPublicId] = useState(organizations[0]?.id ?? "");
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalSubject, displayName, email: email || undefined, organizationPublicId, role })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setMessage({ kind: "error", text: data.message ?? data.error ?? `Error ${res.status}` });
        return;
      }
      setMessage({ kind: "ok", text: `Usuario ${displayName} dado de alta con rol ${role}.` });
      setExternalSubject("");
      setDisplayName("");
      setEmail("");
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Fallo de red" });
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (user: AdminUser) => {
    const reason = window.prompt(`Motivo de baja de ${user.displayName}:`);
    if (!reason || reason.length < 4) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/users/${encodeURIComponent(user.externalSubject)}/deactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (user: AdminUser, assignment: Assignment) => {
    if (!window.confirm(`¿Retirar la adscripción ${assignment.role} @ ${assignment.organization} de ${user.displayName}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/users/${encodeURIComponent(user.externalSubject)}/revoke-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationPublicId: assignment.organizationPublicId, reason: "revocacion_desde_admin" })
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form className="form" onSubmit={create}>
        <div className="form-row">
          <div className="field" style={{ minWidth: 220 }}>
            <label htmlFor="ua-sub">Sujeto externo (ID del IdP)</label>
            <input id="ua-sub" value={externalSubject} onChange={(e) => setExternalSubject(e.target.value)} required minLength={2} placeholder="p. ej. oidc|director-benito-juarez" />
          </div>
          <div className="field" style={{ minWidth: 200 }}>
            <label htmlFor="ua-name">Nombre</label>
            <input id="ua-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} />
          </div>
          <div className="field" style={{ minWidth: 200 }}>
            <label htmlFor="ua-email">Correo (opcional)</label>
            <input id="ua-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="field" style={{ minWidth: 240 }}>
            <label htmlFor="ua-org">Organización (adscripción)</label>
            <select id="ua-org" value={organizationPublicId} onChange={(e) => setOrganizationPublicId(e.target.value)} required>
              {organizations.length === 0 ? <option value="">Sin organizaciones</option> : null}
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name} ({org.type})</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ minWidth: 200 }}>
            <label htmlFor="ua-role">Rol</label>
            <select id="ua-role" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>
        <div className="status-row">
          <button className="button primary" type="submit" disabled={busy || organizations.length === 0}>
            <UserPlus size={16} aria-hidden="true" /> {busy ? "Guardando..." : "Dar de alta y asignar"}
          </button>
          {message ? <span className={`status-pill ${message.kind === "ok" ? "safe" : "critical"}`}>{message.text}</span> : null}
        </div>
      </form>

      <div className="table-wrap" style={{ marginTop: "1.5rem" }}>
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Adscripciones vigentes</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.length === 0 ? (
              <tr><td colSpan={4} className="muted">Sin usuarios institucionales todavía.</td></tr>
            ) : (
              initialUsers.map((user) => (
                <tr key={user.externalSubject}>
                  <td>
                    <strong>{user.displayName}</strong>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>{user.externalSubject}{user.email ? ` · ${user.email}` : ""}</div>
                  </td>
                  <td>
                    {user.assignments.length === 0 ? (
                      <span className="muted">Sin adscripción vigente</span>
                    ) : (
                      <div className="status-row" style={{ gap: 6 }}>
                        {user.assignments.map((assignment) => (
                          <span key={`${assignment.role}-${assignment.organizationPublicId}`} className="status-pill" style={{ gap: 6 }}>
                            {assignment.role} @ {assignment.organization}
                            <button type="button" onClick={() => revoke(user, assignment)} disabled={busy} aria-label="Retirar adscripción" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--red)", padding: 0 }}>
                              <Unlink size={12} aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill ${user.disabled ? "critical" : "safe"}`}>{user.disabled ? "Desactivado" : "Activo"}</span>
                  </td>
                  <td>
                    {!user.disabled ? (
                      <button type="button" className="button" onClick={() => deactivate(user)} disabled={busy} style={{ color: "var(--red)", borderColor: "rgba(201,54,62,0.3)" }}>
                        <PowerOff size={13} aria-hidden="true" /> Dar de baja
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
