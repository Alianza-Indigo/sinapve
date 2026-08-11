# AGENTS.md

## Proposito

SINAPVE es una plataforma de proteccion escolar. Cada cambio debe priorizar seguridad, privacidad, accesibilidad, auditabilidad y continuidad humana. La IA asiste, pero nunca decide culpabilidad, sanciones, diagnosticos o acciones adversas.

## Convenciones tecnicas

- Stack principal: Next.js App Router, React, TypeScript, Vercel.
- Datos transaccionales: Neon PostgreSQL mediante Drizzle ORM.
- Objetos sensibles: Vercel Blob privado, nunca filesystem efimero.
- Cache y rate limiting: pendiente de proveedor administrado en Vercel.
- Procesos durables: Vercel Workflows cuando se active orquestacion avanzada.
- Eventos asincronos: Vercel Queues cuando se active fan-out.
- APIs: REST/JSON versionadas bajo `/api/v1`.
- Runtime servidor: Node.js para datos, cifrado, PDF, integraciones y logica de dominio.
- No usar Supabase, paquetes `@supabase/*`, variables `SUPABASE_*`, Firebase como reemplazo silencioso ni almacenamiento local persistente.

## Dominios

- Identity & Access.
- Institutions & Territory.
- Reporting.
- Case Management.
- Protocol Orchestration.
- Intervention & Referral.
- Learning & Certification.
- Risk & AI.
- Analytics & Reporting.
- Audit & Compliance.
- Communications.

## Seguridad y privacidad

- Validar permisos en servidor; ocultar UI no cuenta como control.
- Aplicar RBAC + ABAC para rol, adscripcion, alcance, sensibilidad y vigencia.
- Registrar busquedas, accesos y mutaciones sensibles como eventos de auditoria append-only.
- No cargar datos inventados en desarrollo, preview ni produccion.
- No exponer datos sensibles en notificaciones, URLs, logs o errores.
- Toda excepcion break-glass requiere motivo, duracion, MFA y auditoria reforzada.

## Definition of Done

- Cumple el PRD y la trazabilidad requisito -> epica -> historia -> prueba.
- Tiene validacion de entrada y pruebas automatizadas proporcionales al riesgo.
- Incluye estados de carga, vacio, error, offline y sin permisos cuando aplique.
- Es accesible por teclado y compatible con WCAG 2.2 AA.
- Queda instrumentado con eventos/auditoria/metricas relevantes.
- No introduce secretos, datos reales ni dependencias excluidas.
- Si cambia una decision arquitectonica, agrega un ADR en `docs/adr/`.
