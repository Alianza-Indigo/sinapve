# Trazabilidad inicial

| Requisito PRD | Epica | Historia inicial | Prueba |
|---|---|---|---|
| Reporte publico sin exigir registro | EP-02 | Como visitante puedo enviar una solicitud de ayuda anonima/confidencial/identificada | `reports.test.ts` |
| RBAC + ABAC en servidor | EP-01 | Como sistema debo explicar permisos efectivos por rol y alcance | `access.test.ts` |
| Auditoria append-only | EP-12 | Como responsable puedo rastrear accesos y mutaciones sensibles | `audit.test.ts` |
| G01/G04/G05/G07/G10/G19 | EP-13 | Como autoridad veo metricas certificadas y su calidad | `metrics.test.ts` |
| Protocolos con SLA | EP-04 | Como APVE puedo iniciar una ruta de actuacion con hitos medibles | `protocols.test.ts` |
| IA supervisada | EP-09 | Como APVE veo recomendaciones como borrador con confirmacion humana obligatoria | `ai-policy.test.ts` |
| Cero Supabase | Plataforma | Como equipo tecnico evito paquetes y variables prohibidas | `package.test.ts` |
