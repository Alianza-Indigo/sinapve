-- G24 Percepción de seguridad (Likert/IPSE). Encuesta. Anual/trimestral.
-- Fuente pendiente: tabla de encuestas (surveys). Modelo listo; produce el índice
-- cuando se capture la encuesta IPSE. No se infiere de otros datos operativos.
select 'G24' as graph_id, 1 as metric_version, cast(null as numeric) as ipse,
       'fuente_pendiente_encuestas_ipse' as nota
