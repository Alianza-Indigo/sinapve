# SINAPVE

Plataforma Nacional del Sistema Nacional del Agente Preventivo de Violencia Escolar.

Esta entrega deja una base operativa alineada al PRD:

- Monorepo con pnpm/Turborepo.
- Next.js App Router con TypeScript, preparado para Vercel.
- Cero dependencias de Supabase.
- Drizzle ORM sobre Neon PostgreSQL serverless.
- Vercel Blob privado para evidencia sensible.
- Modelo inicial de organizaciones, reportes, casos, protocolos, metricas y auditoria.
- Portal publico de ayuda, backoffice, expediente, protocolo y tablero analitico.
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
