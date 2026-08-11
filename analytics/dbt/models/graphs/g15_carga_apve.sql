-- G15 Carga de trabajo APVE (lollipop). Casos activos ponderados por severidad. Diaria.
select 'G15' as graph_id, 1 as metric_version,
       a.user_id as responsable,
       count(*) as casos,
       sum(case c.severity when 'critica' then 4 when 'grave' then 3 when 'moderada' then 2 else 1 end) as carga_ponderada
from {{ source('sinapve', 'case_assignments') }} a
join {{ source('sinapve', 'cases') }} c on c.id = a.case_id and c.state <> 'cerrado'
group by 1, 2, a.user_id
