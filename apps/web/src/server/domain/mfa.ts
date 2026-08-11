import type { Actor } from "./types";

// EP-01: MFA + step-up. El PRD (3.2, 6.1, 12.1) exige segundo factor para todo
// privilegio elevado y para el acceso break-glass. La identidad institucional
// llega verificada por el gateway mediante encabezados seguros; el gateway
// tambien afirma si la sesion presento un segundo factor vigente. Aqui se
// concentra la politica de que operaciones exigen esa afirmacion.

export type StepUpCapability =
  | "case:update"
  | "protocol:run"
  | "audit:read"
  | "privacy:read"
  | "technical:operate"
  | "break_glass";

const stepUpCapabilities: StepUpCapability[] = [
  "case:update",
  "protocol:run",
  "audit:read",
  "privacy:read",
  "technical:operate",
  "break_glass"
];

export function requiresStepUp(capability: string): capability is StepUpCapability {
  return stepUpCapabilities.includes(capability as StepUpCapability);
}

export class StepUpRequiredError extends Error {
  constructor(public readonly capability: StepUpCapability) {
    super("STEP_UP_REQUIRED");
    this.name = "StepUpRequiredError";
  }
}

// Devuelve true si el actor puede ejecutar la operacion elevada. Nunca confia en
// ocultar UI: cada ruta sensible debe invocar assertStepUp en el servidor.
export function hasFreshStepUp(actor: Actor) {
  return actor.mfaVerified === true;
}

export function assertStepUp(actor: Actor, capability: StepUpCapability) {
  if (!requiresStepUp(capability)) return;
  if (!hasFreshStepUp(actor)) {
    throw new StepUpRequiredError(capability);
  }
}
