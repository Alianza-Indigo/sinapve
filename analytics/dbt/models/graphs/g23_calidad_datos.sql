-- G23 Calidad de datos (heatmap). Completitud, oportunidad, consistencia. Diaria.
-- completitud_dato = campos_requeridos_validos / campos_requeridos_esperados * 100
with casos as (
    select
        (case when protection_summary_ciphertext is not null then 1 else 0 end)
      + (case when assigned_user_id is not null then 1 else 0 end)
      + (case when first_response_minutes is not null then 1 else 0 end) as validos,
        3 as esperados
    from {{ source('sinapve', 'cases') }}
)
select 'G23' as graph_id, 1 as metric_version, 'completitud' as dimension,
       case when sum(esperados) = 0 then 0 else round(sum(validos)::numeric / sum(esperados) * 100, 2) end as value
from casos
