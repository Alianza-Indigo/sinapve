# infra/database — Migraciones y ramas de base

La base transaccional es **Neon PostgreSQL**; el esquema y las migraciones se
gestionan con **Drizzle**. Las migraciones se **generan** en el repo y se
**aplican** contra la base enlazada como un paso explícito (no ocurre solo con
`next build`).

## Estado actual

- Esquema: `apps/web/src/server/db/schema.ts`.
- Migraciones versionadas: `apps/web/drizzle/0000–0007` (la última habilita
  PostGIS y crea `territorial_points`).
- Config: `apps/web/drizzle.config.ts` (usa `DATABASE_URL`).

## Flujo

```bash
# 1) Generar migración tras cambiar el esquema (autor).
corepack pnpm db:generate

# 2) Aplicar migraciones a la base enlazada (por ambiente).
DATABASE_URL="postgres://...neon.tech/db?sslmode=require" corepack pnpm db:migrate
```

`db:migrate` (apps/web/scripts/migrate.ts) usa el mismo driver Neon HTTP de la
app y es idempotente: solo ejecuta las migraciones nuevas.

## Promoción (PRD 11.7)

- **Preview:** cada PR usa una **rama de base aislada** de Neon; aplicar
  migraciones ahí antes de validar.
- **Staging → Production:** la promoción exige migración validada, respaldo,
  smoke tests y plan de rollback. Migraciones destructivas se dividen en
  **expand → migrate → contract** para evitar indisponibilidad.
- Aplicar migraciones como paso de CI/deploy **antes** de promover el despliegue
  que las requiere (nunca conectar un preview a producción).

## Requisitos

- El rol de base debe poder `CREATE EXTENSION` para PostGIS (Neon lo permite).
- Nunca ejecutar `db:migrate` contra producción desde una máquina local sin
  control de cambios; hágalo desde el pipeline aprobado.
