-- G30 Ejecución presupuestal (burn-up/barras). Devengado, ejercido y meta. Mensual.
select 'G30' as graph_id, 1 as metric_version,
       component as serie,
       sum(devengado::numeric) as devengado,
       sum(ejercido::numeric) as ejercido,
       sum(meta::numeric) as meta
from {{ source('sinapve', 'budget_lines') }}
group by 1, 2, component
