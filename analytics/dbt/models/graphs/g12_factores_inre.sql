-- G12 Factores del INRE (barras divergentes). Aporte por dimensión (última corrida). Mensual.
with ultima as (
    select factors
    from {{ source('sinapve', 'risk_scores') }}
    order by computed_at desc
    limit 1
)
select 'G12' as graph_id, 1 as metric_version,
       f.key as serie,
       (f.value->>'contribution')::numeric as contribucion
from ultima, jsonb_each((select factors from ultima)) as f(key, value)
