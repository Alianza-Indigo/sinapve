# ADR 0005: Rol SUPER_ADMIN con acceso total

## Estado

Aceptada (a solicitud del propietario del producto).

## Contexto

El PRD aplica separación de funciones (RBAC/ABAC, §3.2): ningún rol ve toda la
plataforma, y en particular el administrador técnico no debe navegar
expedientes, ni el nivel federal ver reportes/casos individuales. Sin embargo, el
operador de la plataforma (superadministrador) necesita, por decisión explícita,
acceso total sin restricción para operar y configurar el sistema.

## Decisión

Se introduce un rol dedicado **`SUPER_ADMIN`** que **omite** las comprobaciones
de acceso:

- `hasCapability` devuelve `true` para cualquier capacidad.
- `canReadReport` y `canReadCase` devuelven `true` (incluye expedientes fuera de
  alcance y de sensibilidad `altamente_sensible`).
- `canReadModule` devuelve `true` para todos los módulos (incluido
  `integrations`).

El bypass está acotado a este rol; el comportamiento de los demás roles no
cambia. Se asigna por configuración (p. ej. `SINAPVE_ADMIN_ROLES=SUPER_ADMIN`).

## Consecuencias

- Es una **excepción explícita** a la separación de funciones del PRD (§3.2).
  Debe reservarse al operador de la plataforma; no repartirse como rol ordinario.
- Toda acción de un `SUPER_ADMIN` queda en la bitácora append-only (auditoría),
  igual que cualquier otro actor.
- Cuando se enlace el IdP definitivo, conviene limitar quién puede portar este
  rol y considerar acceso excepcional (break-glass) para tareas puntuales en vez
  de un superadmin permanente.
- Revertir esta decisión (retirar el bypass) requiere un nuevo ADR.
