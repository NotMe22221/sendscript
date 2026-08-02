import type {
  AuthorizationContract,
  Decision,
  MissionRequirements,
  Offer,
  PolicyEvaluation,
  SafePravaMetadata,
  TransactionResult,
} from "@/lib/domain/schemas";
import type { PolicyConfig } from "@/lib/domain/policy-engine";

export interface OfferProvider {
  search(requirements: MissionRequirements): Promise<Offer[]>;
}

export interface PolicyEngine {
  evaluate(offer: Offer, requirements: MissionRequirements, policy: PolicyConfig): PolicyEvaluation;
}

export interface DecisionEngine {
  decide(offers: Offer[], evaluations: PolicyEvaluation[], neededBy: string): Decision;
}

export interface SafeCard {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  status: string;
}

export interface PravaPaymentProvider {
  listCards(): Promise<SafeCard[]>;
  createMandateSession(contract: AuthorizationContract): Promise<SafePravaMetadata>;
  resolveActiveMandate(merchant: string, amountCents: number, createdAfter?: string): Promise<SafePravaMetadata>;
  getMandate(mandateId: string): Promise<SafePravaMetadata>;
  revokeMandate(mandateId: string): Promise<SafePravaMetadata>;
  chargeMandate(mandateId: string, amountCents: number, reference: string): Promise<{
    safeMetadata: SafePravaMetadata;
    credential?: unknown;
  }>;
  reportMandateCharge(mandateId: string, transactionId: string, approved: boolean, amountCents: number): Promise<SafePravaMetadata>;
}

export interface CheckoutAdapter {
  complete(input: {
    missionId: string;
    merchant: string;
    amountCents: number;
    credential: unknown;
    idempotencyReference: string;
  }): Promise<TransactionResult>;
}
