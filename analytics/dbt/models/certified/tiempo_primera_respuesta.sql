-- Metrica certificada: tiempo_primera_respuesta (v1)
-- Formula: timestamp_primera_accion_protectora - timestamp_reporte_recibido (minutos)
-- Inclusiones: primera accion protectora registrada en expediente.
-- Exclusiones: acciones administrativas no protectoras.
select 'tiempo_primera_respuesta' as metric_code, 1 as metric_version,
       percentile_cont(0.5) within group (order by first_response_minutes) as value_p50,
       percentile_cont(0.9) within group (order by first_response_minutes) as value_p90
from {{ source('sinapve', 'cases') }}
where first_response_minutes is not null
