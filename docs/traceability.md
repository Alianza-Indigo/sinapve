# Trazabilidad PRD

| Requisito PRD | Epica | Historia inicial | Prueba |
|---|---|---|---|
| Reporte publico sin exigir registro | EP-02 | Como visitante puedo enviar una solicitud de ayuda anonima/confidencial/identificada | `reports.test.ts` |
| RBAC + ABAC en servidor | EP-01 | Como sistema debo explicar permisos efectivos por rol y alcance | `access.test.ts` |
| Auditoria append-only | EP-12 | Como responsable puedo rastrear accesos y mutaciones sensibles | `audit.test.ts` |
| G01-G32 | EP-13 | Como autoridad veo el catalogo obligatorio de graficas y su calidad | `metrics.test.ts` |
| Protocolos con SLA | EP-04 | Como APVE puedo iniciar una ruta de actuacion persistida con hitos medibles | `protocols.test.ts` |
| Apertura y actualizacion de caso | EP-03 | Como APVE puedo convertir un reporte en expediente y actualizar su estado | API `/cases`, `/cases/{caseId}` |
| Recursos API PRD | EP-02..EP-15 | Como integrador consumo mensajes, asignaciones, cierre/reapertura, pasos, metricas, mapas, IA, certificaciones e informes | `docs/api/openapi.yaml` |
| Linea de tiempo auditable | EP-03/EP-12 | Como APVE puedo agregar eventos no destructivos al expediente | API `/cases/{caseId}/events` |
| Intervencion y seguimiento | EP-05 | Como APVE puedo consultar planes de intervencion reales por caso | `repository.test.ts` |
| Escalamiento circuito cerrado | EP-06 | Como UEPE/EMIR puedo consultar referencias con acuse y estado | `repository.test.ts` |
| Formacion y certificacion | EP-10 | Como formador puedo consultar programas e inscripciones versionadas | `repository.test.ts` |
| Comunidad y campañas | EP-11 | Como equipo escolar puedo consultar iniciativas con salvaguardas | `repository.test.ts` |
| Instituciones CEC/UAT/UEPE/CMCE/EMIR | EP-07 | Como coordinador opero cuerpos colegiados, sesiones, acuerdos y disponibilidad EMIR | API `/modules/institutions` |
| Comunicacion y campanas | EP-15 | Como comunicador gestiono campanas con aprobacion editorial/legal y metricas | API `/modules/communications` |
| Adaptaciones contextuales | EP-16/EP-17 | Como UEPE solicito adaptaciones con revision tecnica, legal, accesible y de privacidad | API `/modules/adaptations` |
| Integraciones e idempotencia | EP-06/EP-17 | Como integrador registra eventos externos con clave idempotente y trazabilidad | API `/modules/integrations` |
| Buscador universal | EP-01/EP-03/EP-13 | Como usuario autorizado busco folios y registros sin saltarme permisos | API `/search` |
| Administracion territorial | EP-01/EP-07 | Como administrador configuro organizaciones y asignaciones de usuario sin semillas sinteticas | API `/organizations`, `/users` |
| Privacidad y derechos de titulares | EP-08/EP-12 | Como titular solicito acceso/rectificacion/cancelacion/oposicion y privacidad da seguimiento | API `/privacy-requests`, `/modules/privacy` |
| IA supervisada | EP-09 | Como APVE veo recomendaciones como borrador con confirmacion humana obligatoria | `ai-policy.test.ts` |
| Cero Supabase | Plataforma | Como equipo tecnico evito paquetes y variables prohibidas | `package.test.ts` |
| Plataforma integral | EP-01..EP-18 | Como usuario autorizado navego todos los modulos del PRD sin datos inventados | `repository.test.ts` |
| Motor SLA y ventanas de vencimiento | EP-04 | Como sistema calculo hitos, estado normal/proximo/vencido y pausas auditables | `sla.test.ts` |
| Migracion de protocolo activo | EP-04 | Como responsable migro un expediente a una nueva version de protocolo | API `/protocol-runs/{runId}/migrate` |
| Revision de plan de intervencion | EP-05 | Como APVE reviso resultados y programo la siguiente revision del plan | API `/intervention-plans/{planId}/review` |
| Escalamiento por falta de respuesta | EP-06 | Como sistema escalo referencias sin acuse y cierro el circuito | `sla.test.ts`, API `/referrals/{referralId}/escalate`, Cron `/cron/sla-review` |
| Ciclo de vida EMIR y sesiones colegiadas | EP-07 | Como coordinador despacho/libero equipos EMIR y registro quorum y acuerdos | API `/emir-dispatches/{id}/advance`, `/institutional-sessions` |
| Certificacion verificable y recertificacion | EP-10 | Como formador inscribo, emito certificados con codigo verificable y vigencia | API `/training/enrollments`, `/training/enrollments/{id}/certify` |
| Mediacion con bloqueos automaticos | EP-11 | Como sistema bloqueo mediacion en violencia grave, sexual, coercitiva o delictiva | `mediation.test.ts` |
| Metricas certificadas y supresion de celdas | EP-13 | Como analista uso formulas versionadas con umbral de privacidad | `dashboards.test.ts` |
| Informes autogenerados con aprobacion humana | EP-14 | Como autoridad genero borradores desde metricas certificadas y los apruebo | API `/report-jobs`, `/report-jobs/{reportId}/approve` |
| Aprobacion editorial/legal de campanas | EP-15 | Como comunicador publico campanas solo con doble aprobacion | API `/campaigns/{campaignId}/advance` |
| Constructor de tableros certificados | EP-17 | Como administrador publico tableros validando widgets certificados sin SQL libre | `dashboards.test.ts`, API `/dashboards/{dashboardId}/publish` |
| Adaptaciones con revision multidisciplinaria | EP-17 | Como UEPE avanzo la revision tecnica/juridica/accesible/privacidad antes de aprobar | API `/adaptations/{adaptationId}/advance` |
| Baja de cuenta y revocacion de adscripcion | EP-01 | Como administrador desactivo cuentas y cierro adscripciones revocando sesiones al instante | API `/users/{externalSubject}/deactivate`, `/revoke-assignment` |
| Permisos efectivos explicables | EP-01 | Como sistema explico cada capacidad por el rol que la otorga | `access-effective.test.ts` |
| Graficas accesibles con tabla equivalente | EP-13 | Como usuario autorizado veo indicadores certificados en SVG accesible con tabla de datos | `MetricWidgetChart`, backoffice analitica |
| Indicadores publicos agregados | EP-18 | Como ciudadania consulto cifras agregadas con umbral de privacidad sin registros individuales | `public-indicators.test.ts`, API `/public/indicators`, portal `/transparencia` |
| Identidad firmada por gateway | EP-01 | Como plataforma verifico la firma HMAC de la identidad para no confiar en encabezados falsificables | `gateway-signature.test.ts` |
| Relying party OIDC/SAML (Auth.js) | EP-01 | Como usuario inicio sesion con identidad institucional y la app deriva rol y alcance de los claims | `oidc-claims.test.ts`, ruta `/api/auth/[...nextauth]` |
| INRE configurable y versionado | EP-08 | Como analista calculo el indice con pesos versionados, datos faltantes visibles y contribucion por dimension | `inre.test.ts`, API `/risk/inre` |
| IA supervisada por AI Gateway | EP-09 | Como APVE recibo clasificacion asistida validada contra JSON Schema con confirmacion humana | API `/ai/classifications` |
| Asistente de protocolos con RAG | EP-09 | Como responsable consulto doctrina aprobada con fuente, version y confianza | `rag.test.ts`, API `/ai/protocol-assistant` |
| Orquestacion durable portable | EP-04/EP-06 | Como sistema encolo recordatorios y vencimientos de acuse idempotentes y los proceso desde el Cron | Cron `/cron/sla-review`, `durable_jobs` |
