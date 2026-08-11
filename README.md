# SINAPVE

Plataforma Nacional del Sistema Nacional del Agente Preventivo de Violencia Escolar.

Esta primera entrega crea las fundaciones tecnicas del PRD:

- Monorepo compatible con pnpm/Turborepo.
- Next.js App Router con TypeScript, preparado para Vercel.
- Cero dependencias de Supabase.
- Drizzle ORM para Neon PostgreSQL serverless.
- Modelo inicial de organizaciones, reportes, casos, protocolos, metricas y auditoria.
- Portal publico de ayuda, backoffice sintetico, expediente, protocolo y tablero analitico.
- APIs REST versionadas en `/api/v1`.
- Documentacion ADR, OpenAPI inicial, trazabilidad y runbook de servicios Vercel.

## Desarrollo local

```bash
npm install
npm run dev
```

La app vive en `apps/web` y usa datos sinteticos cuando `DATABASE_URL` no esta configurado.

## Validacion

```bash
npm run typecheck
npm test
npm run build
```

## Servicios requeridos en Vercel

Provisionar por Vercel Marketplace:

- Neon Postgres.
- Vercel Blob privado.
- Upstash Redis.
- Vercel Workflows y Queues para SLA, fan-out y notificaciones.

Las variables viven en `.env.example`. No se deben agregar variables ni paquetes de Supabase.
