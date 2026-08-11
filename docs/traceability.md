# Trazabilidad inicial

| Requisito PRD | Epica | Historia inicial | Prueba |
|---|---|---|---|
| Reporte publico sin exigir registro | EP-02 | Como visitante puedo enviar una solicitud de ayuda anonima/confidencial/identificada | `reports.test.ts` |
| RBAC + ABAC en servidor | EP-01 | Como sistema debo explicar permisos efectivos por rol y alcance | `access.test.ts` |
| Auditoria append-only | EP-12 | Como responsable puedo rastrear accesos y mutaciones sensibles | `audit.test.ts` |
| G01/G04/G05/G07/G10/G19 | EP-13 | Como autoridad veo metricas certificadas y su calidad | `metrics.test.ts` |
| Protocolos con SLA | EP-04 | Como APVE puedo iniciar una ruta de actuacion con hitos medibles | `protocols.test.ts` |
| Intervencion y seguimiento | EP-05 | Como APVE puedo consultar planes de intervencion reales por caso | `repository.test.ts` |
| Escalamiento circuito cerrado | EP-06 | Como UEPE/EMIR puedo consultar referencias con acuse y estado | `repository.test.ts` |
| Formacion y certificacion | EP-10 | Como formador puedo consultar programas e inscripciones versionadas | `repository.test.ts` |
| Comunidad y campañas | EP-11 | Como equipo escolar puedo consultar iniciativas con salvaguardas | `repository.test.ts` |
| IA supervisada | EP-09 | Como APVE veo recomendaciones como borrador con confirmacion humana obligatoria | `ai-policy.test.ts` |
| Cero Supabase | Plataforma | Como equipo tecnico evito paquetes y variables prohibidas | `package.test.ts` |
| Plataforma integral | EP-01..EP-18 | Como usuario autorizado navego todos los modulos del PRD sin datos inventados | `repository.test.ts` |
