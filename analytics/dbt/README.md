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

- `certified/` — **las 7 fórmulas certificadas del PRD 8.3, completas**
  (tasa_incidencia, tiempo_primera_respuesta, cumplimiento_sla,
  tasa_reincidencia_6m, cobertura_certificacion, escalamiento_efectivo,
  completitud_dato).
- `graphs/` — **catálogo obligatorio G01–G32 (8.2), completo, sin stubs**: un
  modelo por gráfica (`gNN_nombre.sql`), cada uno con `graph_id`/`metric_version`
  y su prueba `not_null` en `graphs/schema.yml`.

Todos los modelos computan de tablas reales. Los insumos que no provienen de la
operación (INRE por corrida, encuestas IPSE/NPS, matrícula, permanencia, impacto
DiD, presupuesto) se **capturan** vía `POST /api/v1/analytics/inputs` y viven en
tablas propias (`risk_scores`, `survey_responses`, `enrollment_figures`,
`school_retention`, `impact_measurements`, `budget_lines`). No se infiere ningún
indicador de datos ajenos ni se inventan valores.

El contrato de existencia y `graph_id` se verifica en
`apps/web/src/server/__contract__/dbt-graphs.test.ts`.
