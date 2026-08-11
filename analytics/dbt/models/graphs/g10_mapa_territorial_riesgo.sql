-- G10 Mapa territorial de riesgo (coroplético). INRE y densidad por territorio. Diaria.
select 'G10' as graph_id, 1 as metric_version,
       coalesce(o.state_code, 'sin_estado') as territorio,
       count(*) as casos,
       round(avg(case c.severity when 'critica' then 100 when 'grave' then 75 when 'moderada' then 50 else 25 end), 1) as riesgo_promedio
from {{ source('sinapve', 'cases') }} c
left join {{ source('sinapve', 'organizations') }} o on o.id = c.organization_id
group by 1, 2, territorio
