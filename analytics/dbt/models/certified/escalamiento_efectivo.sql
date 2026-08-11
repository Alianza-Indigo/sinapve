-- Metrica certificada: escalamiento_efectivo (v1)
-- Formula: referencias_con_acuse_y_accion / referencias_enviadas_elegibles * 100
-- Inclusiones: referencias enviadas elegibles con destino competente.
-- Exclusiones: referencias anuladas antes del envio.
with enviadas as (
    select id, status
    from {{ source('sinapve', 'referrals') }}
    where status <> 'anulada'
),
agg as (
    select
        count(*) as elegibles,
        count(*) filter (where status in ('acuse_recibido', 'en_atencion', 'resuelto', 'cerrado')) as con_accion
    from enviadas
)
select
    'escalamiento_efectivo' as metric_code,
    1 as metric_version,
    case when elegibles = 0 then 0
         else round(con_accion::numeric / elegibles * 100, 2)
    end as value,
    elegibles as denominator
from agg
