-- G18 Tiempo de respuesta externa (box plot). Acuse y primera acción externa. Semanal.
with tiempos as (
    select extract(epoch from (closed_at - created_at)) / 3600.0 as horas
    from {{ source('sinapve', 'referrals') }}
    where closed_at is not null
)
select 'G18' as graph_id, 1 as metric_version,
       percentile_cont(0.5) within group (order by horas) as p50_horas,
       percentile_cont(0.9) within group (order by horas) as p90_horas
from tiempos
