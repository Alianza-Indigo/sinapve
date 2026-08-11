-- G16 Capacidad EMIR (ocupación). Disponibilidad, traslado, intervención. Tiempo real.
select 'G16' as graph_id, 1 as metric_version, status as estado, count(*) as value
from {{ source('sinapve', 'emir_dispatches') }}
group by 1, 2, status
