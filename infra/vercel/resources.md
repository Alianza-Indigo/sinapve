# infra/vercel — Recursos administrados y variables

Recursos que el proyecto Vercel debe tener enlazados. La app degrada con
gracia (`*_not_configured`) cuando un recurso no está enlazado, de modo que
Preview/Local funcionan sin todos ellos.

## Recursos

| Recurso | Propósito | Variable(s) |
|---|---|---|
| Neon PostgreSQL | Datos transaccionales (Drizzle) + PostGIS | `DATABASE_URL` |
| Vercel Blob privado | Evidencia sensible (`access: private`) | `BLOB_READ_WRITE_TOKEN` |
| Cron | Revisión SLA y drenaje de cola | `CRON_SECRET` |
| Identidad OIDC/SAML | Auth.js relying party | `AUTH_SECRET`, `SINAPVE_OIDC_*` |
| Gateway de identidad | Firma HMAC de encabezados | `SINAPVE_GATEWAY_SIGNING_KEY` |
| AI Gateway | IA supervisada + RAG | `SINAPVE_AI_GATEWAY_URL/KEY/MODEL` |
| Antivirus | Escaneo de adjuntos | `SINAPVE_AV_SCAN_URL/KEY` |
| Notificaciones | Correo/SMS/push/voz | `SINAPVE_EMAIL/SMS/PUSH/VOICE_WEBHOOK` |
| Cola durable nativa | Vercel Queues/Workflows | `SINAPVE_QUEUE_PUBLISH_URL/TOKEN` |
| Cifrado de campo | AES-256-GCM | `SINAPVE_FIELD_ENCRYPTION_KEY` |

Ver `.env.example` para la lista completa. Las funciones API usan runtime
Node.js (ver `vercel.json`) por Drizzle, cifrado, PDF e integraciones.

## Reglas

- Blobs de expediente siempre privados; URLs públicas prohibidas para evidencia.
- Cron protegido por `CRON_SECRET`; los consumidores de cola son idempotentes.
- Región de cómputo cercana a la base (ver `regions` en `vercel.json`).
