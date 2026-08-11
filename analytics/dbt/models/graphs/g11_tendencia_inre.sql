-- G11 Tendencia INRE (línea con banda). Mensual.
-- Fuente definitiva: tabla risk_scores versionada (pendiente). Modelo listo con
-- proxy mensual del peso de severidad; se reemplaza al persistir el INRE calculado.
select 'G11' as graph_id, 1 as metric_version,
       date_trunc('month', created_at)::date as x_bucket,
       round(avg(case severity when 'critica' then 100 when 'grave' then 75 when 'moderada' then 50 else 25 end), 1) as inre_proxy
from {{ source('sinapve', 'cases') }}
group by 1, 2, x_bucket
order by x_bucket
