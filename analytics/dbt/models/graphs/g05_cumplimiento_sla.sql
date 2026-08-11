-- G05 Cumplimiento de SLA (bullet). Tiempo real.
-- cumplimiento_sla = casos_con_primera_respuesta_en_sla / casos_elegibles * 100
with elegibles as (
    select id, first_response_minutes, sla_minutes
    from {{ source('sinapve', 'cases') }}
    where sla_minutes is not null and first_response_minutes is not null
)
select 'G05' as graph_id, 1 as metric_version,
       case when count(*) = 0 then 0
            else round(count(*) filter (where first_response_minutes <= sla_minutes)::numeric / count(*) * 100, 2)
       end as value,
       count(*) as denominator
from elegibles
