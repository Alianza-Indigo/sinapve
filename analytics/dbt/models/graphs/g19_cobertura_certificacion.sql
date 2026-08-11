-- G19 Cobertura de certificación (gauge + barras). Vigente / obligado. Diaria.
-- cobertura_certificacion = personal_con_certificacion_vigente / personal_obligado_activo * 100
with base as (
    select count(distinct user_id) as obligados,
           count(distinct user_id) filter (where status = 'certificado' and (expires_at is null or expires_at > now())) as vigentes
    from {{ source('sinapve', 'training_enrollments') }}
)
select 'G19' as graph_id, 1 as metric_version,
       case when obligados = 0 then 0 else round(vigentes::numeric / obligados * 100, 2) end as value,
       obligados as denominator
from base
