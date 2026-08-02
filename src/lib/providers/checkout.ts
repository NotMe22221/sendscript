import type { TransactionResult } from "@/lib/domain/schemas";
import type { CheckoutAdapter } from "./types";

export class ControlledMerchantCheckout implements CheckoutAdapter {
  async complete(input: {
    missionId: string;
    merchant: string;
    amountCents: number;
    credential: unknown;
    idempotencyReference: string;
  }): Promise<TransactionResult> {
    if (!input.credential) throw new Error("CHECKOUT_CREDENTIAL_MISSING");
    return {
      id: crypto.randomUUID(),
      missionId: input.missionId,
      amountCents: input.amountCents,
      merchant: input.merchant,
      status: "succeeded",
      idempotencyReference: input.idempotencyReference,
      checkoutReference: `MRA-${Math.floor(10_000 + Math.random() * 89_999)}`,
      createdAt: new Date().toISOString(),
    };
  }
}
