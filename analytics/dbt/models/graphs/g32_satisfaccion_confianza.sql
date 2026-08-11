-- G32 Satisfacción y confianza (NPS adaptado). Encuestas posteriores seguras. Mensual.
-- Fuente pendiente: encuestas de satisfacción. Modelo listo; no se vincula a
-- sanciones individuales (32 del catálogo). Produce el índice al capturar la encuesta.
select 'G32' as graph_id, 1 as metric_version, cast(null as numeric) as indice_confianza,
       'fuente_pendiente_encuestas_satisfaccion' as nota
