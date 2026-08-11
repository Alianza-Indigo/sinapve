-- G03 Distribución por severidad (barras apiladas 100%). Diaria.
select 'G03' as graph_id, 1 as metric_version, severity as serie, count(*) as value
from {{ source('sinapve', 'cases') }}
group by 1, 2, severity
