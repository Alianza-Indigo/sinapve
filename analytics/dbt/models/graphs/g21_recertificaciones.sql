-- G21 Próximas recertificaciones (heatmap/calendario). Certificados por vencer. Diaria.
select 'G21' as graph_id, 1 as metric_version,
       date_trunc('month', expires_at)::date as mes_vencimiento,
       count(*) as value
from {{ source('sinapve', 'training_enrollments') }}
where status = 'certificado' and expires_at is not null and expires_at <= now() + interval '90 days'
group by 1, 2, mes_vencimiento
order by mes_vencimiento
