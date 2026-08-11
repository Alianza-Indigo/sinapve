-- G31 Campañas (línea/funnel). Alcance, interacción, recordación, reporte temprano. Semanal.
select 'G31' as graph_id, 1 as metric_version,
       audience as audiencia,
       count(*) as campanas,
       coalesce(sum((metrics->>'reach')::numeric), 0) as alcance,
       coalesce(sum((metrics->>'earlyReports')::numeric), 0) as reporte_temprano
from {{ source('sinapve', 'communication_campaigns') }}
group by 1, 2, audience
