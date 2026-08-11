-- G20 Progreso de formación (cohortes/área). Inscripción, avance, aprobación, abandono. Diaria.
select 'G20' as graph_id, 1 as metric_version, status as etapa, count(*) as value,
       round(avg(progress_percent), 1) as avance_promedio
from {{ source('sinapve', 'training_enrollments') }}
group by 1, 2, status
