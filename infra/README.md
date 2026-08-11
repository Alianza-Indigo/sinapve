# infra — Infraestructura como referencia reproducible

Estructura de infraestructura del SINAPVE (PRD 11.3/11.7). La configuración
declarativa de despliegue vive en `vercel.json` (raíz); aquí se documenta y
versiona el resto de decisiones de infraestructura para que sean reproducibles.

## Directorios

- `infra/vercel/` — recursos administrados (Neon, Blob, Queues/Workflows, Cron),
  variables de entorno por ambiente y protección de despliegues.
- `infra/database/` — estrategia de migraciones (Drizzle) y ramas de base por
  preview.

## Ambientes (11.7)

| Ambiente | Datos | Despliegue |
|---|---|---|
| Local | Sintéticos / vacío | `next dev` |
| Preview | Rama de base aislada por PR | Automático |
| Staging | Sintéticos o anonimizados | Rama protegida |
| Production | Datos reales protegidos | Promoción aprobada |

Ningún preview se conecta a producción. Todo secreto vive en Vercel Environment
Variables con separación Preview/Staging/Production.
