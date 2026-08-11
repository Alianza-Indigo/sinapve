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
- La compatibilidad hacia atrás se mantiene: los pasos compilados siguen siendo
  `ProtocolStep` válidos, y los protocolos lineales heredados se normalizan a
  grafo sin migrar datos.

## Ejecución condicional rama por rama

La primera versión aplanaba el grafo a una ruta lineal. Ahora el **motor de
corridas ejecuta la ramificación condicional**:

- Cada transición compilada conserva su condición (`{ to, condition }`), de modo
  que una decisión ofrece ramas etiquetadas.
- `deriveProtocolRunState(steps, events)` (dominio puro) reduce los pasos
  compilados + los eventos registrados a un estado navegable: recorre desde el
  inicio siguiendo **solo la rama elegida** en cada decisión, marcando los pasos
  alcanzados como completados, el detenido como en progreso/bloqueado, lo
  alcanzable a futuro como pendiente y lo inalcanzable como **omitido**.
- Al completar una decisión, el operador **elige la rama** (`chosenNext`);
  `validateBranchChoice` la valida en cliente y servidor. Se persiste en la nueva
  columna `protocol_step_events.chosen_next` (migración 0009, `EXPECTED_MIGRATIONS`
  = 10). La corrida se cierra al alcanzar un `fin` y se marca bloqueada si un paso
  se bloquea.
- La consola de corrida (`ProtocolRunConsole`) en el expediente carga el estado
  desde `GET /api/v1/protocol-runs/{runId}` y avanza paso a paso, mostrando las
  ramas de cada decisión.
