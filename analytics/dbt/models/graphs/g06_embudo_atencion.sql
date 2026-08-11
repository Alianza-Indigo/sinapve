-- G06 Embudo de atención (funnel). Reporte > triaje > caso > seguimiento > cierre. Diaria.
select 'G06' as graph_id, 1 as metric_version, 'reporte' as etapa, 1 as orden, count(*) as value from {{ source('sinapve', 'reports') }}
union all
select 'G06', 1, 'triaje', 2, count(*) from {{ source('sinapve', 'reports') }} where status <> 'recibido'
union all
select 'G06', 1, 'caso', 3, count(*) from {{ source('sinapve', 'cases') }}
union all
select 'G06', 1, 'seguimiento', 4, count(*) from {{ source('sinapve', 'cases') }} where state = 'en_seguimiento'
union all
select 'G06', 1, 'cierre', 5, count(*) from {{ source('sinapve', 'cases') }} where state = 'cerrado'
