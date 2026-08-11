-- G11 Tendencia INRE (línea con banda). Puntaje y calidad por mes. Mensual.
select 'G11' as graph_id, 1 as metric_version,
       date_trunc('month', computed_at)::date as x_bucket,
       round(avg(score), 1) as inre,
       round(avg(quality), 1) as calidad
from {{ source('sinapve', 'risk_scores') }}
group by 1, 2, x_bucket
order by x_bucket
