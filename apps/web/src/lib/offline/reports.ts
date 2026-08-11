import { draftsStore, type DraftRecord } from "./db";
import { decryptJson, encryptJson } from "./crypto";

// Cola de sincronización offline de reportes. Los borradores se guardan cifrados
// y se envían al recuperar la red. La entrega es idempotente por clientRequestId.

export type ReportDraftPayload = Record<string, string>;

function newId(): string {
  return `draft_${crypto.randomUUID()}`;
}

export async function queueReportDraft(payload: ReportDraftPayload): Promise<string> {
  const id = newId();
  // clientRequestId estable para deduplicar si un envío parcial se reintenta.
  const withKey = { clientRequestId: id, ...payload };
  const ciphertext = await encryptJson(withKey);
  await draftsStore.put({ id, ciphertext, createdAt: new Date().toISOString(), status: "pending" });
  return id;
}

export async function pendingDraftCount(): Promise<number> {
  const all = await draftsStore.getAll();
  return all.filter((d) => d.status === "pending").length;
}

// Intenta enviar los borradores pendientes. Devuelve cuántos se sincronizaron.
// Un rechazo de validación (4xx) marca el borrador como fallido (no se reintenta
// en bucle); un fallo de red lo deja pendiente para el próximo intento.
export async function syncReportDrafts(): Promise<{ synced: number; pending: number; failed: number }> {
  const drafts = await draftsStore.getAll();
  let synced = 0;
  let failed = 0;
  for (const draft of drafts as DraftRecord[]) {
    if (draft.status === "failed") continue;
    let payload: ReportDraftPayload;
    try {
      payload = await decryptJson<ReportDraftPayload>(draft.ciphertext);
    } catch {
      await draftsStore.put({ ...draft, status: "failed", lastError: "decrypt_failed" });
      failed += 1;
      continue;
    }
    try {
      const response = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        await draftsStore.delete(draft.id);
        synced += 1;
      } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        await draftsStore.put({ ...draft, status: "failed", lastError: `http_${response.status}` });
        failed += 1;
      }
      // 5xx / 429: se deja pendiente para reintento posterior.
    } catch {
      // Sin red: se conserva pendiente.
    }
  }
  const pending = await pendingDraftCount();
  return { synced, pending, failed };
}
