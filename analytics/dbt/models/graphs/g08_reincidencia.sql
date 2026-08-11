-- G08 Reincidencia (línea/cohortes). Casos reabiertos. Mensual.
-- tasa_reincidencia = casos_con_nueva_incidencia / casos_cerrados_elegibles * 100
with base as (
    select count(*) filter (where state = 'reabierto') as reabiertos,
           count(*) filter (where state in ('cerrado', 'reabierto')) as cerrados_elegibles
    from {{ source('sinapve', 'cases') }}
)
select 'G08' as graph_id, 1 as metric_version,
       case when cerrados_elegibles = 0 then 0 else round(reabiertos::numeric / cerrados_elegibles * 100, 2) end as value
from base
