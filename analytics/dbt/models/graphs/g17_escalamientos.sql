-- G17 Escalamientos (Sankey). Origen, destino y resultado. Diaria.
-- escalamiento_efectivo = referencias_con_acuse_y_accion / referencias_enviadas_elegibles * 100
select 'G17' as graph_id, 1 as metric_version,
       destination_type as destino, status as resultado, count(*) as value
from {{ source('sinapve', 'referrals') }}
where status <> 'anulada'
group by 1, 2, destination_type, status
