# ADR 0003: El segundo factor (MFA) vive en el proveedor de identidad, no en la app

## Estado

Aceptada.

## Contexto

El PRD exige segundo factor para privilegios elevados y para el acceso
break-glass (secciones 3.2, 6.1 y 12.1). Sin embargo, el proveedor OIDC/SAML
definitivo es una decision pendiente (PRD seccion 20.5) y la identidad
institucional llega a la aplicacion ya verificada por un gateway mediante
encabezados seguros (`x-sinapve-*`).

Implementar un mecanismo de MFA dentro de la aplicacion (verificacion de
segundo factor, afirmaciones tipo `x-sinapve-mfa-verified`, politicas de
step-up en el codigo) duplicaria una responsabilidad que corresponde al
proveedor de identidad, acoplaria la app a un esquema propio antes de decidir
el proveedor y daria una falsa sensacion de control de seguridad.

## Decision

El segundo factor se aplica exclusivamente en el proveedor de identidad
institucional (OIDC/SAML) y en el gateway que precede a la aplicacion. La
aplicacion **no** implementa MFA propio:

- No se agregan modulos, tipos ni encabezados de MFA/step-up en el codigo de la
  app (por ejemplo, nada de `mfaVerified` en el `Actor` ni de
  `x-sinapve-mfa-verified`).
- La aplicacion confia en que el gateway solo entrega identidad para sesiones
  que ya cumplieron el segundo factor exigido por politica.
- Las operaciones elevadas y el break-glass se controlan por RBAC + ABAC,
  auditoria reforzada y alcance; el factor de autenticacion es responsabilidad
  del proveedor.

## Consecuencias

- Cuando se defina el proveedor OIDC/SAML (PRD 20.5), la exigencia de MFA para
  privilegios elevados se configura alli y en el gateway, no en este repo.
- Si en el futuro se decidiera mover parte del control de MFA a la aplicacion,
  requiere un nuevo ADR que revierta esta decision de forma explicita.

## Nota para evitar regresiones

No reintroducir MFA/step-up en la aplicacion (modulos `mfa`, campo
`mfaVerified`, encabezado `x-sinapve-mfa-verified`, respuestas
`step_up_required`) sin un ADR que sustituya a este. El MFA es responsabilidad
del proveedor de identidad.
