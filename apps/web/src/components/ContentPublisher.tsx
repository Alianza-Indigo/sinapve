"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Send, Trash2 } from "lucide-react";

type AdminPost = {
  id: string;
  kind: string;
  title: string;
  slug: string;
  status: string;
  tag: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export function ContentPublisher({ initialPosts }: { initialPosts: AdminPost[] }) {
  const router = useRouter();
  const [kind, setKind] = useState("noticia");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/content/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title,
          summary,
          body: body || undefined,
          tag: tag || undefined,
          externalUrl: externalUrl || undefined,
          publish
        })
      });
      const data = (await res.json().catch(() => ({}))) as { post?: { status: string }; issues?: string[]; message?: string };
      if (!res.ok) {
        setMessage({ kind: "error", text: data.issues?.join(" · ") ?? data.message ?? `Error ${res.status}` });
        return;
      }
      setMessage({ kind: "ok", text: publish ? "Publicación creada y publicada." : "Borrador guardado." });
      setTitle("");
      setSummary("");
      setBody("");
      setTag("");
      setExternalUrl("");
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Fallo de red" });
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (post: AdminPost) => {
    const next = post.status === "publicado" ? "borrador" : "publicado";
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/content/posts/${post.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const removePost = async (post: AdminPost) => {
    if (!window.confirm(`¿Eliminar definitivamente "${post.title}"? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/content/posts/${post.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form className="form" onSubmit={submit}>
        <div className="form-row">
          <div className="field" style={{ minWidth: 160 }}>
            <label htmlFor="cp-kind">Tipo</label>
            <select id="cp-kind" value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="noticia">Noticia</option>
              <option value="comunicado">Comunicado</option>
              <option value="recurso">Recurso</option>
            </select>
          </div>
          <div className="field" style={{ minWidth: 160 }}>
            <label htmlFor="cp-tag">Etiqueta (opcional)</label>
            <input id="cp-tag" value={tag} onChange={(event) => setTag(event.target.value)} placeholder="p. ej. Comunicado" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="cp-title">Título</label>
          <input id="cp-title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={160} />
        </div>
        <div className="field">
          <label htmlFor="cp-summary">Resumen</label>
          <input id="cp-summary" value={summary} onChange={(event) => setSummary(event.target.value)} required minLength={3} maxLength={400} />
        </div>
        <div className="field">
          <label htmlFor="cp-body">Cuerpo (opcional, separa párrafos con línea en blanco)</label>
          <textarea id="cp-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={20000} />
        </div>
        <div className="field">
          <label htmlFor="cp-url">Enlace externo (para recursos descargables, opcional)</label>
          <input id="cp-url" type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://..." />
        </div>
        <label className="status-pill" style={{ gap: 8, width: "fit-content" }}>
          <input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} /> Publicar de inmediato
        </label>
        <div className="status-row">
          <button className="button primary" type="submit" disabled={busy}>
            <Send size={16} aria-hidden="true" /> {busy ? "Guardando..." : "Guardar publicación"}
          </button>
          {message ? <span className={`status-pill ${message.kind === "ok" ? "safe" : "critical"}`}>{message.text}</span> : null}
        </div>
      </form>

      <div className="table-wrap" style={{ marginTop: "1.5rem" }}>
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Actualizado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {initialPosts.length === 0 ? (
              <tr><td colSpan={5} className="muted">Sin publicaciones todavía.</td></tr>
            ) : (
              initialPosts.map((post) => (
                <tr key={post.id}>
                  <td>{post.title}</td>
                  <td style={{ textTransform: "capitalize" }}>{post.kind}</td>
                  <td>
                    <span className={`status-pill ${post.status === "publicado" ? "safe" : ""}`}>{post.status}</span>
                  </td>
                  <td className="muted">{post.updatedAt?.slice(0, 10)}</td>
                  <td>
                    <div className="status-row" style={{ gap: 6 }}>
                      <button className="button" type="button" onClick={() => toggleStatus(post)} disabled={busy}>
                        {post.status === "publicado" ? <><EyeOff size={14} aria-hidden="true" /> Retirar</> : <><Eye size={14} aria-hidden="true" /> Publicar</>}
                      </button>
                      <button className="button" type="button" onClick={() => removePost(post)} disabled={busy} aria-label={`Eliminar ${post.title}`} style={{ color: "var(--red)", borderColor: "rgba(201,54,62,0.3)" }}>
                        <Trash2 size={14} aria-hidden="true" /> Eliminar
                      </button>
                    </div>
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
