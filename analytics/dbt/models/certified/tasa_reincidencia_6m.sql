-- Metrica certificada: tasa_reincidencia_6m (v1)
-- Formula: casos_con_nueva_incidencia_6m / casos_cerrados_elegibles * 100
-- Inclusiones: casos cerrados con seguimiento a 6 meses.
-- Exclusiones: casos cerrados por error o duplicidad.
with base as (
    select count(*) filter (where state = 'reabierto') as reincidentes,
           count(*) filter (where state in ('cerrado', 'reabierto')) as cerrados_elegibles
    from {{ source('sinapve', 'cases') }}
)
select 'tasa_reincidencia_6m' as metric_code, 1 as metric_version,
       case when cerrados_elegibles = 0 then 0 else round(reincidentes::numeric / cerrados_elegibles * 100, 2) end as value
from base
