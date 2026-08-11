# Runbook: recursos Vercel

## Marketplace

Provisionar en este orden:

1. Neon Postgres.
2. Upstash Redis.
3. Vercel Blob con almacenamiento privado.
4. Vercel Workflows y Queues.

Despues de vincular el proyecto:

```bash
vercel link
vercel env pull .env.local --yes
npm run db:generate
npm run db:seed
```

## Politicas

- Preview, Staging y Production usan recursos y secretos aislados.
- Los previews solo deben usar datos sinteticos.
- `CRON_SECRET` debe validarse en cada endpoint Cron.
- Las migraciones destructivas siguen expand/migrate/contract.
- Los adjuntos de expediente solo se consultan desde servidor con permiso vigente.

## Blob privado

Crear un store privado desde dashboard o CLI:

```bash
vercel blob create-store sinapve-evidence --access private
vercel env pull .env.local --yes
```

La aplicacion usa:

- `POST /api/v1/cases/{caseId}/evidence` para subir evidencia con `access: "private"`.
- `GET /api/v1/cases/{caseId}/evidence?pathname=...` para servirla despues de validar permiso del expediente.
- `Cache-Control: private, no-cache` y `X-Content-Type-Options: nosniff` en la entrega.

No devolver URLs `*.private.blob.vercel-storage.com` al cliente como mecanismo de acceso. La URL de Blob queda tratada como dato interno del servidor.
