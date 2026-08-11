# analytics/dbt — Capa semantica de metricas certificadas

Proyecto dbt que materializa las fórmulas certificadas del PRD (8.3) como vistas
sobre la base transaccional Neon PostgreSQL. Es la fuente única de verdad
analítica: las gráficas del producto (`packages/domain/src/certified-metrics.ts`)
y estos modelos comparten definición y versión.

## Principios

- Una fórmula → un modelo versionado (`metric_code`, `metric_version`, `value`).
- dbt solo **lee** las fuentes (`models/sources.yml`); nunca escribe en operación.
- Un cambio de fórmula exige nueva versión, pruebas y fecha efectiva (8.6).
- La supresión de celdas pequeñas y el alcance por permiso se aplican en la capa
  de servicio antes de exponer datos (no en dbt).

## Uso

```bash
# Requiere un profile "sinapve" apuntando a la base (o una rama de preview).
dbt deps
dbt build   # ejecuta modelos + tests de schema.yml
```

## Modelos

- `certified/` — fórmulas certificadas del PRD 8.3 (cumplimiento_sla,
  escalamiento_efectivo, cobertura_certificacion).
- `graphs/` — **catálogo obligatorio G01–G32 (8.2), completo**: un modelo por
  gráfica (`gNN_nombre.sql`), cada uno con `graph_id`/`metric_version` y su
  prueba `not_null` en `graphs/schema.yml`. Espejan `buildCertifiedWidgets`
  (`packages/domain/src/metrics.ts`).

### Fuentes pendientes (modelos listos, dependen de un origen aún no capturado)

Estos modelos existen y producen su métrica en cuanto se enlace su fuente; no se
infiere de datos operativos para no falsear el indicador:

- G11/G12 (INRE persistido por corrida) · G24/G32 (encuestas IPSE/satisfacción) ·
  G25 (matrícula por plantel) · G27 (permanencia escolar) · G28 (diseño de
  evaluación DiD) · G30 (sistema presupuestal).

El contrato de existencia y `graph_id` se verifica en
`apps/web/src/server/__contract__/dbt-graphs.test.ts`.
