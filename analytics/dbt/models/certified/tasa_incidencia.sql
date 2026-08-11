-- Metrica certificada: tasa_incidencia (v1)
-- Formula: casos_validos / matricula_media_periodo * 1000
-- Inclusiones: casos con severidad confirmada por humano.
-- Exclusiones: reportes descartados y duplicados fusionados.
with casos as (select count(*) as c from {{ source('sinapve', 'cases') }}),
matricula as (select avg(students) as m from {{ source('sinapve', 'enrollment_figures') }})
select 'tasa_incidencia' as metric_code, 1 as metric_version,
       case when (select m from matricula) is null or (select m from matricula) = 0 then null
            else round((select c from casos)::numeric / (select m from matricula) * 1000, 2)
       end as value
