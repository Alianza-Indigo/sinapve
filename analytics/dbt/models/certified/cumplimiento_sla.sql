-- Metrica certificada: cumplimiento_sla (v1)
-- Formula: casos_con_primera_respuesta_en_sla / casos_elegibles * 100
-- Inclusiones: casos elegibles con SLA vigente.
-- Exclusiones: casos con SLA pausado por motivo permitido.
with elegibles as (
    select
        id,
        first_response_minutes,
        sla_minutes
    from {{ source('sinapve', 'cases') }}
    where sla_minutes is not null
      and first_response_minutes is not null
),
agg as (
    select
        count(*) as casos_elegibles,
        count(*) filter (where first_response_minutes <= sla_minutes) as casos_en_sla
    from elegibles
)
select
    'cumplimiento_sla' as metric_code,
    1 as metric_version,
    case when casos_elegibles = 0 then 0
         else round(casos_en_sla::numeric / casos_elegibles * 100, 2)
    end as value,
    casos_elegibles as denominator
from agg
