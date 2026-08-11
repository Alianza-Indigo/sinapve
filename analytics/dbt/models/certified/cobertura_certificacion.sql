-- Metrica certificada: cobertura_certificacion (v1)
-- Formula: personal_con_certificacion_vigente / personal_obligado_activo * 100
-- Inclusiones: personal obligado activo.
-- Exclusiones: personal en baja o licencia.
with inscripciones as (
    select
        user_id,
        status,
        expires_at
    from {{ source('sinapve', 'training_enrollments') }}
),
agg as (
    select
        count(distinct user_id) as obligados,
        count(distinct user_id) filter (
            where status = 'certificado' and (expires_at is null or expires_at > now())
        ) as vigentes
    from inscripciones
)
select
    'cobertura_certificacion' as metric_code,
    1 as metric_version,
    case when obligados = 0 then 0
         else round(vigentes::numeric / obligados * 100, 2)
    end as value,
    obligados as denominator
from agg
