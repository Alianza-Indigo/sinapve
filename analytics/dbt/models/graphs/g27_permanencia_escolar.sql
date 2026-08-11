-- G27 Permanencia escolar (cohortes). Continuidad vinculada a casos atendidos. Trimestral.
select 'G27' as graph_id, 1 as metric_version,
       cohort_period as x_bucket,
       case when sum(total) = 0 then 0 else round(sum(continued)::numeric / sum(total) * 100, 2) end as tasa_permanencia
from {{ source('sinapve', 'school_retention') }}
group by 1, 2, cohort_period
order by cohort_period
