-- G12 Factores del INRE (barras divergentes). Aporte por dimensión. Mensual.
-- Fuente definitiva: contribuciones por dimensión del modelo INRE (packages/domain/src/inre.ts)
-- persistidas por corrida. Modelo listo con el catálogo de dimensiones; el aporte
-- se llena cuando se registren las corridas del INRE.
select 'G12' as graph_id, 1 as metric_version, dimension as serie, cast(null as numeric) as contribucion,
       'fuente_pendiente_inre_runs' as nota
from (values ('conductual'), ('grupal'), ('digital'), ('ambiental'), ('familiar'), ('comunitaria'), ('territorial')) as d(dimension)
