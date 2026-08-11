-- G02 Reportes vs. casos confirmados (barras agrupadas). Diaria.
select 'G02' as graph_id, 1 as metric_version, 'reportes' as serie, count(*) as value
from {{ source('sinapve', 'reports') }}
union all
select 'G02', 1, 'casos_confirmados', count(*)
from {{ source('sinapve', 'cases') }}
