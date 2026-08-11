# Runbook: recursos Vercel

## Recursos enlazados

El proyecto asume que la base administrada y el almacenamiento privado ya existen en Vercel.

Despues de enlazar el proyecto:

```bash
vercel link
vercel env pull .env.local --yes
corepack pnpm db:generate
```

## Politicas

- Preview, Staging y Production usan recursos y secretos aislados.
- La plataforma no carga expedientes, reportes ni metricas inventadas.
- `CRON_SECRET` debe validarse en cada endpoint Cron.
- Las migraciones destructivas siguen expand/migrate/contract.
- Los adjuntos de expediente solo se consultan desde servidor con permiso vigente.

## Evidencia privada

La aplicacion usa:

- `POST /api/v1/cases/{caseId}/evidence` para subir evidencia con `access: "private"`.
- `GET /api/v1/cases/{caseId}/evidence?pathname=...` para servirla despues de validar permiso del expediente.
- `Cache-Control: private, no-cache` y `X-Content-Type-Options: nosniff` en la entrega.

No devolver URLs privadas del almacenamiento al cliente como mecanismo de acceso. La URL queda tratada como dato interno del servidor.
