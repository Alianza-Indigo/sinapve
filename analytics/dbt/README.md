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

- `certified/cumplimiento_sla.sql`
- `certified/escalamiento_efectivo.sql`
- `certified/cobertura_certificacion.sql`

El resto del catálogo G01–G32 se incorpora aquí de forma incremental, cada uno
con su prueba en `schema.yml`.
