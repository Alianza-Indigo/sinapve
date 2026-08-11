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
