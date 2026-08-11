-- G25 Incidencia ajustada (línea doble). Casos por 1,000 + tasa de reporte. Mensual.
-- tasa_incidencia = casos_validos / matricula_media_periodo * 1000
with casos as (
    select to_char(created_at, 'YYYY-MM') as period, count(*) as casos
    from {{ source('sinapve', 'cases') }}
    group by 1
),
matricula as (
    select period, avg(students) as matricula_media
    from {{ source('sinapve', 'enrollment_figures') }}
    group by period
)
select 'G25' as graph_id, 1 as metric_version,
       c.period as x_bucket,
       c.casos,
       case when m.matricula_media is null or m.matricula_media = 0 then null
            else round(c.casos::numeric / m.matricula_media * 1000, 2)
       end as por_1000_matricula
from casos c
left join matricula m on m.period = c.period
order by c.period
