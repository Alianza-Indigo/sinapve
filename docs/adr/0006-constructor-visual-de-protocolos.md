# ADR 0006: Constructor visual de protocolos (grafo → pasos lineales)

## Estado

Aceptada (a solicitud del propietario del producto).

## Contexto

El PRD (EP-04, §7.x) contempla que la coordinación pueda **diseñar y versionar
protocolos** de atención sin depender de despliegues de código. La operación en
curso ya ejecuta protocolos como una lista lineal de pasos
(`protocol_versions.steps`, consumida por `protocol_runs` y el `ProtocolStepper`),
pero esos pasos hasta ahora se creaban por código con contenido fijo.

Faltaba una superficie de autoría: un editor donde un flujo de pasos y
transiciones se dibuje visualmente, se valide y se publique como una nueva
versión.

## Decisión

- El protocolo se modela como un **grafo dirigido acíclico (DAG)** de nodos
  (pasos: `inicio`/`accion`/`decision`/`fin`) y aristas (transiciones), en el
  módulo puro `@sinapve/domain/protocol-graph`.
- `validateProtocolGraph` aplica **las mismas reglas en cliente y servidor**
  (forma con Zod + reglas semánticas: un solo inicio, fin alcanzable, sin ciclos,
  referencias válidas, monotonía temporal como advertencia).
- Al publicar, `compileProtocolGraph` hace un **orden topológico** y produce la
  lista lineal `steps[]` que ya consumen las corridas. Cada paso compilado
  conserva la topología (`kind`, coordenadas, `next[]`) para poder **reabrir el
  editor** (`graphFromSteps`), incluyendo protocolos lineales heredados.
- **No se añade tabla ni migración**: se reutiliza `protocol_versions.steps`
  (jsonb). Publicar incrementa la versión del código, desactiva las anteriores si
  se marca activa y deja rastro en la bitácora (`protocol_version.publish`).
- La autoría queda tras una capacidad nueva **`protocol:author`**, otorgada a
  `UEPE` (coordinación nacional) y, por bypass, a `SUPER_ADMIN`. Ejecutar un
  protocolo (`protocol:run`) sigue siendo una capacidad distinta.
- El editor es **autocontenido** (SVG + React, sin librerías nuevas de canvas).

## Consecuencias

- El diseño de protocolos ya no requiere desplegar código; queda versionado y
  auditado como cualquier otro cambio de doctrina.
- La compatibilidad hacia atrás se mantiene: las corridas y el stepper siguen
  leyendo `steps[]` como una lista lineal.
- Un grafo con ramas de decisión se aplana a una ruta lineal ordenada por
  dependencia y `dueMinute`; la ejecución condicional por rama (elegir sucesor en
  tiempo real) queda fuera de alcance de esta primera versión y requeriría
  extender el motor de corridas (nuevo ADR).
