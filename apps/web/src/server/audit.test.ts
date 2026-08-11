import { describe, expect, it } from "vitest";
import { buildAuditEvent } from "./audit";

describe("audit events", () => {
  it("marks generated audit events as immutable", () => {
    const event = buildAuditEvent({
      actorId: "usr",
      action: "case.read",
      resourceType: "case",
      resourceId: "case_001"
    });

    expect(event.immutable).toBe(true);
    expect(event.createdAt).toBeTruthy();
  });
});
