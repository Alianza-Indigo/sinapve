-- G22 Cumplimiento de auditoría (barras). Hallazgos cerrados / totales. Semanal.
select 'G22' as graph_id, 1 as metric_version,
       count(*) as total,
       count(*) filter (where status = 'cerrado') as cerrados,
       case when count(*) = 0 then 0 else round(count(*) filter (where status = 'cerrado')::numeric / count(*) * 100, 2) end as porcentaje
from {{ source('sinapve', 'audit_findings') }}
