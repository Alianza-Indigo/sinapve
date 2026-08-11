-- G07 Antigüedad de casos abiertos (histograma). Días en estado activo. Diaria.
with abiertos as (
    select extract(day from (now() - created_at)) as dias
    from {{ source('sinapve', 'cases') }}
    where state <> 'cerrado'
)
select 'G07' as graph_id, 1 as metric_version,
       case when dias <= 7 then '0-7' when dias <= 30 then '8-30' else '31+' end as bucket,
       count(*) as value
from abiertos
group by 1, 2, bucket
