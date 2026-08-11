-- G32 Satisfacción y confianza (NPS adaptado). Encuestas posteriores seguras. Mensual.
-- No se vincula a sanciones individuales (catálogo 8.2).
select 'G32' as graph_id, 1 as metric_version,
       period as x_bucket,
       round(avg(score), 1) as nps,
       count(*) as respuestas
from {{ source('sinapve', 'survey_responses') }}
where survey_type = 'nps'
group by 1, 2, period
order by period
