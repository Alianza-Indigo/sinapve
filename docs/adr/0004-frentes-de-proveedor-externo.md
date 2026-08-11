# ADR 0004: Codigo listo para proveedor con degradacion elegante (identidad firmada, IA/RAG, INRE, cola durable)

## Estado

Aceptada.

## Contexto

Varias capacidades del PRD dependen de decisiones o servicios externos aun no
enlazados (proveedor OIDC/SAML, AI Gateway, orquestacion durable de Vercel).
Depender de un servicio externo no impide construir el codigo: se puede
implementar la logica completa con una frontera de integracion clara y
degradacion elegante cuando la variable de entorno no esta enlazada, siguiendo
la convencion `*_not_configured` del repositorio.

## Decision

Se implementa el codigo de estos frentes en el repositorio, activandose por
configuracion:

1. **Identidad firmada por gateway (EP-01).** `SINAPVE_GATEWAY_SIGNING_KEY`
   habilita la verificacion HMAC-SHA256 de los encabezados de identidad
   (`server/auth/gateway-signature.ts`). Sin clave, la verificacion queda
   deshabilitada (modo desarrollo). No sustituye al proveedor OIDC/SAML (ADR
   0003): cierra el hueco de encabezados falsificables entre el gateway y la app.

2. **IA supervisada y RAG (EP-09).** Cliente agnostico de proveedor via
   AI Gateway compatible con la API de chat estilo OpenAI
   (`server/ai/gateway.ts`), clasificacion validada contra JSON Schema
   (`server/ai/classify.ts`) y asistente de protocolos con RAG sobre la base
   documental aprobada (`server/ai/rag.ts`, tabla `approved_documents`). Sin
   gateway enlazado, la IA queda apagada y los flujos humanos continuan. La IA
   nunca decide: `requires_human_confirmation` y cita fuente/version.

3. **INRE configurable y versionado (EP-08).** `server/domain/inre.ts` calcula el
   indice como modelo con pesos versionados, datos faltantes visibles, calidad y
   contribucion por dimension; no es una suma fija incrustada. Requiere revision
   humana antes de asignar recursos o auditar.

4. **Cola de trabajos durables (EP-04/06).** Patron outbox sobre PostgreSQL
   (`server/data/jobs.ts`, tabla `durable_jobs`): entrega al menos una vez,
   consumidores idempotentes por `idempotencyKey`, reintentos con backoff. Es la
   forma portable de la orquestacion durable; puede dispararse desde Cron y, en
   produccion, desde Vercel Queues/Workflows sin depender de estado en memoria.

5. **Relying party OIDC/SAML (EP-01).** Cliente de identidad con Auth.js
   (`server/auth/oidc.ts`) y mapeo de claims a `Actor`
   (`server/auth/oidc-claims.ts`), detras de configuracion: si el proveedor no
   esta enlazado (`SINAPVE_OIDC_*`, `AUTH_SECRET`), no se registra proveedor y la
   app mantiene el modelo de gateway por encabezados firmados. El resolutor
   unificado `resolveActor` prioriza la sesion OIDC y cae al gateway. El servicio
   de identidad (IdP) y los secretos son externos; el codigo de integracion vive
   en el repositorio.

## Consecuencias

- Enlazar cada capacidad es una tarea de configuracion (variables/entorno), no de
  desarrollo.
- Cualquier cambio de proveedor mantiene la frontera de integracion; sustituir el
  transporte (por ejemplo, el AI Gateway o la cola por Vercel Queues) no cambia la
  logica de dominio.
- El proveedor OIDC/SAML sigue pendiente (PRD 20.5) y no lo reemplaza este ADR.
