-- G28 Impacto DiD (líneas paralelas). Tratamiento vs. comparación antes/después. Anual.
-- efecto_did = (trat_después - trat_antes) - (comp_después - comp_antes)
with m as (
    select indicator,
           max(value::numeric) filter (where group_type = 'tratamiento' and phase = 'despues') as trat_desp,
           max(value::numeric) filter (where group_type = 'tratamiento' and phase = 'antes')   as trat_antes,
           max(value::numeric) filter (where group_type = 'comparacion' and phase = 'despues') as comp_desp,
           max(value::numeric) filter (where group_type = 'comparacion' and phase = 'antes')   as comp_antes
    from {{ source('sinapve', 'impact_measurements') }}
    group by indicator
)
select 'G28' as graph_id, 1 as metric_version,
       indicator,
       (coalesce(trat_desp, 0) - coalesce(trat_antes, 0)) - (coalesce(comp_desp, 0) - coalesce(comp_antes, 0)) as efecto_did
from m
