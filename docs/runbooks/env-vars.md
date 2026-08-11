# Runbook: variables de entorno de despliegue

Checklist completo para desplegar SINAPVE en Vercel. La app **degrada con
gracia**: si una variable opcional no está enlazada, la capacidad respectiva se
desactiva (`*_not_configured`) sin romper el resto. Cárguelas en
**Vercel → Project → Settings → Environment Variables** con separación
**Preview / Staging / Production**. Nunca las commitee: `.env` está en
`.gitignore`; `.env.example` solo documenta nombres.

Leyenda: **Req** = requerida para operar con datos reales · **Opc** = activa una
capacidad adicional.

## A. Recursos administrados (Vercel Marketplace)

| Variable | Req/Opc | Fuente | Formato / ejemplo |
|---|---|---|---|
| `DATABASE_URL` | Req | Neon (Vercel Marketplace) — la inyecta la integración | `postgresql://USER:PASSWORD@ep-xxx.neon.tech/DB?sslmode=require` |
| `BLOB_READ_WRITE_TOKEN` | Req | Vercel Blob (Storage) — la inyecta la integración | `vercel_blob_rw_XXXXXXXX_XXXXXXXXXXXX` |

> **Migraciones (importante):** los archivos `apps/web/drizzle/0000–0007` están
> **generados pero se aplican aparte**. Con `DATABASE_URL` enlazada, ejecute una
> vez por ambiente, antes de operar:
>
> ```bash
> DATABASE_URL="postgres://..." corepack pnpm db:migrate
> ```
>
> Es idempotente (Drizzle registra lo aplicado). La migración `0007` habilita la
> extensión **PostGIS**; el rol de base debe poder `CREATE EXTENSION` (en Neon,
> disponible por defecto). Ver `infra/database/README.md`.

## B. Secretos que genera usted mismo (no provienen de terceros)

Genere valores fuertes y **distintos por ambiente**. Comandos:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -hex 32      # CRON_SECRET
openssl rand -base64 48   # SINAPVE_FIELD_ENCRYPTION_KEY  (debe tener >= 32 chars)
openssl rand -base64 48   # SINAPVE_GATEWAY_SIGNING_KEY
```

| Variable | Req/Opc | Propósito |
|---|---|---|
| `AUTH_SECRET` | Req si usa OIDC | Cifra la sesión JWT de Auth.js |
| `CRON_SECRET` | Req | Protege `/api/v1/cron/sla-review` y `/api/v1/queues/drain` |
| `SINAPVE_FIELD_ENCRYPTION_KEY` | Req | AES-256-GCM de texto sensible (reportes/casos/privacidad) |
| `SINAPVE_GATEWAY_SIGNING_KEY` | Opc | Verifica la firma HMAC de la identidad del gateway; sin ella, modo dev |

> **Rotación:** `SINAPVE_FIELD_ENCRYPTION_KEY` no debe rotarse sin plan de
> re-cifrado (el prefijo `sinapve:v1:` versiona el esquema). Los demás pueden
> rotarse reiniciando el despliegue.

## C. Identidad OIDC/SAML (Auth.js) — Opc

Del proveedor de identidad institucional (registro de la aplicación cliente).

| Variable | Formato / ejemplo |
|---|---|
| `SINAPVE_OIDC_ISSUER` | `https://idp.institucion.gob.mx/` (URL del emisor, con discovery `/.well-known/openid-configuration`) |
| `SINAPVE_OIDC_CLIENT_ID` | ID de cliente que emite el IdP |
| `SINAPVE_OIDC_CLIENT_SECRET` | Secreto de cliente que emite el IdP |
| `SINAPVE_OIDC_SCOPE` | `openid profile email` (ajuste según claims institucionales) |

> Callback a registrar en el IdP: `https://TU-DOMINIO/api/auth/callback/sinapve-oidc`.
> El IdP debe emitir los claims `sinapve_roles` y `sinapve_organization_id`
> (y `sinapve_state_code`, `sinapve_municipality_code`, `sinapve_school_id`,
> `sinapve_assigned_cases` cuando apliquen). El **MFA** se exige en el IdP
> (ADR 0003).

## D. IA supervisada (AI Gateway) — Opc

| Variable | Formato / ejemplo |
|---|---|
| `SINAPVE_AI_GATEWAY_URL` | Base compatible con chat estilo OpenAI, p. ej. `https://gateway.ai.vercel.app/v1` |
| `SINAPVE_AI_GATEWAY_KEY` | Clave/token del gateway |
| `SINAPVE_AI_MODEL` | ID de modelo, p. ej. `gpt-4o-mini` (por defecto si se omite) |

## E. Antivirus de adjuntos — Opc

| Variable | Formato / ejemplo |
|---|---|
| `SINAPVE_AV_SCAN_URL` | Endpoint del escáner (POST octet-stream → `{ "infected": boolean }`) |
| `SINAPVE_AV_SCAN_KEY` | Bearer del escáner (si aplica) |

> Sin escáner externo corre solo el heurístico local (EICAR). Un escáner caído
> **bloquea** el archivo (no se almacena sin revisar).

## F. Notificaciones multicanal — Opc

Webhooks de proveedor; solo viaja el resumen seguro (nunca detalle sensible).
`in_app` siempre funciona.

| Variable | Canal |
|---|---|
| `SINAPVE_EMAIL_WEBHOOK` | correo |
| `SINAPVE_SMS_WEBHOOK` | SMS |
| `SINAPVE_PUSH_WEBHOOK` | push |
| `SINAPVE_VOICE_WEBHOOK` | voz |

## G. Cola durable nativa — Opc

| Variable | Formato / ejemplo |
|---|---|
| `SINAPVE_QUEUE_PUBLISH_URL` | Endpoint de publicación de Vercel Queues |
| `SINAPVE_QUEUE_TOKEN` | Token de publicación (si aplica) |

> El outbox PostgreSQL (`durable_jobs`) es la fuente de verdad; la cola nativa
> solo acelera el drenaje. El Cron (`0 9 * * *`, ver `vercel.json`) drena de
> respaldo.

## Verificación rápida tras enlazar

```bash
# Indicadores públicos (no requiere identidad): debe responder 200.
curl -s https://TU-DOMINIO/api/v1/public/indicators | jq .

# Cron protegido: sin secreto correcto debe responder 403.
curl -s -o /dev/null -w "%{http_code}\n" https://TU-DOMINIO/api/v1/cron/sla-review
```
