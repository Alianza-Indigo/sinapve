-- G30 Ejecución presupuestal (burn-up/barras). Devengado, ejercido y meta. Mensual.
-- Fuente pendiente: sistema presupuestal. Modelo listo; produce el burn-up al
-- enlazar devengado/ejercido/meta.
select 'G30' as graph_id, 1 as metric_version,
       cast(null as numeric) as devengado, cast(null as numeric) as ejercido, cast(null as numeric) as meta,
       'fuente_pendiente_presupuesto' as nota
