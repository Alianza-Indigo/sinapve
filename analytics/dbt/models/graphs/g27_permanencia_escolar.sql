-- G27 Permanencia escolar (cohortes). Continuidad vinculada a casos atendidos. Trimestral.
-- Fuente pendiente: continuidad escolar por estudiante (sistema estatal). Modelo
-- listo; produce la cohorte al enlazar la fuente de permanencia.
select 'G27' as graph_id, 1 as metric_version, cast(null as numeric) as tasa_permanencia,
       'fuente_pendiente_permanencia_escolar' as nota
