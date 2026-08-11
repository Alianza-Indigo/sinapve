-- G01 Casos por periodo (línea/área). Casos creados por semana. Actualización horaria.
select 'G01' as graph_id, 1 as metric_version,
       date_trunc('week', created_at)::date as x_bucket,
       count(*) as value
from {{ source('sinapve', 'cases') }}
group by 1, 2, 3
order by x_bucket
