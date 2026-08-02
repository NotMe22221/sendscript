import type { MissionStatus } from "./schemas";

export const allowedTransitions: Record<MissionStatus, readonly MissionStatus[]> = {
  DRAFT: ["ANALYZING", "CANCELLED"],
  ANALYZING: ["SOURCING", "FAILED", "CANCELLED"],
  SOURCING: ["POLICY_REVIEW", "FAILED", "CANCELLED"],
  POLICY_REVIEW: ["AWAITING_APPROVAL", "BLOCKED", "FAILED", "CANCELLED"],
  AWAITING_APPROVAL: ["AUTHORIZED", "REJECTED", "EXPIRED", "CANCELLED"],
  AUTHORIZED: ["PURCHASING", "EXPIRED", "CANCELLED"],
  PURCHASING: ["COMPLETED", "BLOCKED", "FAILED"],
  BLOCKED: ["AUTHORIZED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  FAILED: ["ANALYZING", "SOURCING", "AUTHORIZED", "CANCELLED"],
  CANCELLED: [],
  EXPIRED: ["AWAITING_APPROVAL", "CANCELLED"],
};

export function canTransition(from: MissionStatus, to: MissionStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertTransition(from: MissionStatus, to: MissionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`INVALID_STATE_TRANSITION:${from}:${to}`);
  }
}
