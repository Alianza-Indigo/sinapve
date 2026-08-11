-- G24 Percepción de seguridad (IPSE). Encuesta. Anual/trimestral.
select 'G24' as graph_id, 1 as metric_version,
       period as x_bucket,
       round(avg(score), 1) as ipse,
       count(*) as respuestas
from {{ source('sinapve', 'survey_responses') }}
where survey_type = 'ipse'
group by 1, 2, period
order by period
