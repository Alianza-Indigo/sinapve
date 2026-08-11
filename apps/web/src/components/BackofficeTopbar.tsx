import { headers } from "next/headers";
import { resolveActor } from "@/server/auth/session-actor";
import { getRealtimeCounts } from "@/server/data/repository";
import { presetForRoles } from "@/server/domain/dashboard-presets";
import { DashboardTopbar } from "./DashboardTopbar";

// Chrome superior unificado del backoffice: resuelve el actor y muestra el mismo
// DashboardTopbar (marca, buscador, notificaciones, perfil) en todas las páginas
// de la consola, para que el estilo sea consistente en todo el sistema.
export async function BackofficeTopbar() {
  const actor = await resolveActor(await headers());
  if (!actor) {
    return <DashboardTopbar name="Invitado" roleLabel="Sin sesión" notifCount={0} />;
  }
  const counts = await getRealtimeCounts().catch(() => ({ pendingNotifications: 0, overdueReferrals: 0, pendingJobs: 0, criticalCases: 0 }));
  return <DashboardTopbar name={actor.name} roleLabel={presetForRoles(actor.roles).label} notifCount={counts.pendingNotifications} />;
}
