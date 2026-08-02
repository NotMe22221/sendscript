import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "./state-machine";

describe("mission state machine", () => {
  it("supports the complete happy path", () => {
    const path = ["DRAFT", "ANALYZING", "SOURCING", "POLICY_REVIEW", "AWAITING_APPROVAL", "AUTHORIZED", "PURCHASING", "COMPLETED"] as const;
    for (let index = 0; index < path.length - 1; index += 1) expect(canTransition(path[index], path[index + 1])).toBe(true);
  });

  it("supports blocking, rejection, cancellation, failure, and expiry paths", () => {
    expect(canTransition("POLICY_REVIEW", "BLOCKED")).toBe(true);
    expect(canTransition("AWAITING_APPROVAL", "REJECTED")).toBe(true);
    expect(canTransition("AUTHORIZED", "EXPIRED")).toBe(true);
    expect(canTransition("PURCHASING", "FAILED")).toBe(true);
    expect(canTransition("DRAFT", "CANCELLED")).toBe(true);
  });

  it("rejects execution without authorization and terminal-state reuse", () => {
    expect(() => assertTransition("AWAITING_APPROVAL", "PURCHASING")).toThrow("INVALID_STATE_TRANSITION");
    expect(canTransition("COMPLETED", "PURCHASING")).toBe(false);
  });
});
