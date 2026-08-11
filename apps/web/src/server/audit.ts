export type AuditEventInput = {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export function buildAuditEvent(input: AuditEventInput) {
  return {
    ...input,
    createdAt: new Date().toISOString(),
    immutable: true
  };
}
