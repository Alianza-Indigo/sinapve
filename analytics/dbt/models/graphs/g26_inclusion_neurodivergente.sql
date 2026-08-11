-- G26 Inclusión neurodivergente (índices). Casos, ajustes y tiempos, agregados. Mensual.
select 'G26' as graph_id, 1 as metric_version,
       review_status as etapa, count(*) as adaptaciones
from {{ source('sinapve', 'contextual_adaptations') }}
group by 1, 2, review_status
