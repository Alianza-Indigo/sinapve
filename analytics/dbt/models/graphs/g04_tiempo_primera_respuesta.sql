-- G04 Tiempo de primera respuesta (box plot + mediana). Tiempo real.
-- tiempo_primera_respuesta = timestamp_primera_accion_protectora - timestamp_reporte_recibido
select 'G04' as graph_id, 1 as metric_version,
       percentile_cont(0.5) within group (order by first_response_minutes) as p50,
       percentile_cont(0.9) within group (order by first_response_minutes) as p90,
       percentile_cont(0.95) within group (order by first_response_minutes) as p95
from {{ source('sinapve', 'cases') }}
where first_response_minutes is not null
