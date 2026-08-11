-- G14 Alertas IA (barras + precisión). Generadas, confirmadas, descartadas. Semanal.
select 'G14' as graph_id, 1 as metric_version,
       count(*) as generadas,
       count(*) filter (where human_decision in ('confirmada', 'aceptada')) as confirmadas,
       count(*) filter (where human_decision in ('descartada', 'rechazada')) as descartadas
from {{ source('sinapve', 'ai_decision_logs') }}
