-- G13 Matriz riesgo-capacidad (dispersión). INRE vs. capacidad local. Mensual.
with riesgo as (
    select c.organization_id,
           avg(case c.severity when 'critica' then 100 when 'grave' then 75 when 'moderada' then 50 else 25 end) as riesgo,
           count(*) as casos
    from {{ source('sinapve', 'cases') }} c
    group by c.organization_id
),
capacidad as (
    select organization_id, count(*) filter (where status = 'disponible') as equipos_disponibles
    from {{ source('sinapve', 'emir_dispatches') }}
    group by organization_id
)
select 'G13' as graph_id, 1 as metric_version,
       r.organization_id, round(r.riesgo, 1) as riesgo, coalesce(c.equipos_disponibles, 0) as capacidad, r.casos
from riesgo r
left join capacidad c on c.organization_id = r.organization_id
