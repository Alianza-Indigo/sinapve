# SINAPVE

Plataforma Nacional del Sistema Nacional del Agente Preventivo de Violencia Escolar.

Esta entrega deja una base operativa alineada al PRD:

- Monorepo con pnpm/Turborepo.
- Next.js App Router con TypeScript, preparado para Vercel.
- Cero dependencias de Supabase.
- Drizzle ORM sobre Neon PostgreSQL serverless.
- Vercel Blob privado para evidencia sensible.
- Modelo operativo de organizaciones, usuarios, reportes, casos, protocolos, intervenciones, escalamiento, formacion, comunidad, privacidad, metricas y auditoria.
- Portal publico de ayuda, seguimiento, transparencia, backoffice modular, expediente, protocolo y tablero analitico G01-G32.
- APIs REST versionadas en `/api/v1`.
- Cron diario para revision SLA.
- RBAC + ABAC de servidor mediante identidad institucional verificada por headers.

## Desarrollo local

```bash
corepack pnpm install
corepack pnpm dev
```

La app vive en `apps/web`. Si la variable de la base existente no esta enlazada, las vistas muestran estados vacios y las APIs transaccionales responden `database_not_configured`; no se cargan datos de ejemplo.

## Validacion

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

## Configuracion

El proyecto espera que Vercel ya tenga enlazados los recursos administrados de base de datos y archivos privados. La unica variable manual del repositorio es:

- `CRON_SECRET`

No se deben agregar variables ni paquetes de Supabase.

## Evidencia privada

La ruta `POST /api/v1/cases/{caseId}/evidence` sube archivos permitidos al almacenamiento privado con `access: "private"`.
La lectura pasa por `GET /api/v1/cases/{caseId}/evidence?pathname=...`, donde se valida el alcance del expediente antes de llamar `get()` al store privado.

En local sin el token del almacenamiento privado enlazado, esas rutas responden `private_blob_not_configured`.

## Operacion sin datos sinteticos

La plataforma expone flujos para capturar datos reales desde APIs y formularios:

- `POST /api/v1/organizations` y `POST /api/v1/users` configuran catalogo institucional y asignaciones.
- `POST /api/v1/reports` recibe solicitudes publicas de ayuda.
- `POST /api/v1/reports/{reportId}/messages` permite seguimiento seguro del reporte.
- `POST /api/v1/cases`, `/assignments`, `/events`, `/interventions`, `/referrals`, `/close`, `/reopen` y `/protocol-runs` operan expedientes.
- `POST /api/v1/referrals/{referralId}/ack` cierra el circuito de acuse externo.
- `POST /api/v1/protocol-runs/{runId}/steps/{stepId}/complete` registra avance humano del protocolo.
- `GET /api/v1/metrics/{metricCode}` y `GET /api/v1/maps/risk` exponen analitica certificada.
- `POST /api/v1/ai/classifications`, `/ai/summaries` y `/ai/feedback` mantienen IA supervisada y gobernada.
- `GET /api/v1/certifications/verify/{publicCode}` valida certificaciones publicas.
- `POST /api/v1/report-jobs` crea informes aprobables.
- `POST /api/v1/privacy-requests` registra derechos de titulares sin requerir cuenta institucional.
- `POST /api/v1/notifications/{notificationId}/ack` registra acuses criticos.
- `POST /api/v1/modules/{moduleId}` crea registros de instituciones/EMIR, directorio externo, formacion, comunidad, comunicacion, auditoria, informes, privacidad, adaptaciones, configuracion, portal publico, notificaciones e integraciones.

## Transiciones de ciclo de vida operativo

Sobre la base transaccional, la plataforma opera el ciclo de vida completo de cada dominio sin datos sinteticos:

- `POST /api/v1/protocol-runs/{runId}/migrate` migra un expediente activo a una nueva version de protocolo (EP-04).
- `POST /api/v1/intervention-plans/{planId}/review` registra revision de resultados y siguiente revision del plan (EP-05).
- `POST /api/v1/referrals/{referralId}/escalate` y el Cron `sla-review` escalan referencias sin acuse en circuito cerrado (EP-06).
- `POST /api/v1/emir-dispatches/{dispatchId}/advance` opera el ciclo despachado -> en_sitio -> liberado (EP-07).
- `POST /api/v1/institutional-sessions` y `.../{sessionId}/outcome` registran sesiones colegiadas con calculo de quorum, acuerdos y tareas (EP-07).
- `POST /api/v1/training/enrollments` y `.../{enrollmentId}/certify` inscriben y emiten certificados verificables con vigencia (EP-10).
- `POST /api/v1/campaigns/{campaignId}/advance` publica campanas solo con doble aprobacion editorial y legal (EP-15).
- `POST /api/v1/adaptations/{adaptationId}/advance` avanza la revision tecnica/juridica/accesible/privacidad antes de aprobar (EP-16/EP-17).
- `POST /api/v1/report-jobs` autogenera un borrador desde metricas certificadas y `.../{reportId}/approve` exige aprobacion humana (EP-14).
- `POST /api/v1/dashboards/{dashboardId}/publish` publica tableros validando que solo usen widgets certificados, sin SQL ni formulas libres (EP-13/EP-17).

## Seguridad reforzada de servidor

- Segundo factor (MFA): se resuelve en el proveedor de identidad institucional (OIDC/SAML), fuera de la aplicacion. La app NO implementa MFA propio. Ver `docs/adr/0003-mfa-en-proveedor-de-identidad.md`.
- Mediacion: la elegibilidad se evalua de forma determinista y se bloquea automaticamente ante violencia grave, sexual, coercitiva, autolesiones, delito o asimetria de poder.
