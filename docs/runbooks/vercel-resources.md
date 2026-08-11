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
