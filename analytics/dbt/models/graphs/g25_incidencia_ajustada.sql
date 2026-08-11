-- G25 Incidencia ajustada (línea doble). Casos por 1,000 + tasa de reporte. Mensual.
-- tasa_incidencia = casos_validos / matricula_media_periodo * 1000
-- Fuente pendiente: matrícula por plantel/periodo. Modelo listo con el conteo de
-- casos; el ratio por 1,000 se calcula al enlazar la matrícula. No interpretar
-- subreporte como mejora.
select 'G25' as graph_id, 1 as metric_version,
       date_trunc('month', created_at)::date as x_bucket,
       count(*) as casos,
       cast(null as numeric) as por_1000_matricula,
       'fuente_pendiente_matricula' as nota
from {{ source('sinapve', 'cases') }}
group by 1, 2, x_bucket
order by x_bucket
