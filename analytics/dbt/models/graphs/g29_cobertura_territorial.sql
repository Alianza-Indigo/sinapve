-- G29 Cobertura territorial (mapa/barras). Planteles activos / universo. Diaria.
select 'G29' as graph_id, 1 as metric_version,
       coalesce(state_code, 'sin_estado') as territorio,
       count(*) filter (where type = 'school') as planteles
from {{ source('sinapve', 'organizations') }}
group by 1, 2, territorio
