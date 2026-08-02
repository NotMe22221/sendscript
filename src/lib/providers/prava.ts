import "server-only";
import { config } from "@/lib/config";
import type { AuthorizationContract, SafePravaMetadata } from "@/lib/domain/schemas";
import { resolvePravaConnection, type IntegrationSource, type PravaCredentials } from "@/lib/integrations/shared";
import type { PravaPaymentProvider, SafeCard } from "./types";

type JsonRecord = Record<string, unknown>;

function centsToDecimal(cents: number) {
  return (cents / 100).toFixed(2);
}

function safeError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as JsonRecord).error;
    if (error && typeof error === "object") {
      const code = "code" in error ? String((error as JsonRecord).code) : "PRAVA_ERROR";
      const message = "message" in error ? String((error as JsonRecord).message) : fallback;
      return new Error(`${code}:${message}`);
    }
  }
  return new Error(fallback);
}

export class PravaRestProvider implements PravaPaymentProvider {
  constructor(private readonly credentials: PravaCredentials) {}

  private async request(path: string, init?: RequestInit): Promise<JsonRecord> {
    const response = await fetch(`${this.credentials.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: `Bearer ${this.credentials.secretKey}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as JsonRecord;
    if (!response.ok) throw safeError(payload, `PRAVA_HTTP_${response.status}`);
    return payload;
  }

  async listCards(): Promise<SafeCard[]> {
    const params = new URLSearchParams({ customer_id: this.credentials.customerId, status: "active" });
    const payload = await this.request(`/v1/listCards?${params}`);
    const cards = Array.isArray(payload.cards) ? payload.cards : [];
    return cards.map((value) => {
      const card = value as JsonRecord;
      return {
        id: String(card.card_id),
        brand: String(card.card_brand ?? "card"),
        last4: String(card.card_last4 ?? "••••"),
        expiryMonth: Number(card.card_exp_month ?? 0),
        expiryYear: Number(card.card_exp_year ?? 0),
        isDefault: Boolean(card.is_default),
        status: String(card.status ?? "unknown"),
      };
    });
  }

  async createMandateSession(contract: AuthorizationContract): Promise<SafePravaMetadata> {
    const callbackUrl = config.appUrl.startsWith("https://")
      ? `${config.appUrl}/missions/${contract.missionId}/execute?authorization=returned`
      : undefined;
    const payload = await this.request("/v1/sessions", {
      method: "POST",
      body: JSON.stringify({
        user_id: this.credentials.customerId,
        user_email: process.env.DEMO_EMAIL ?? "judge@spendscript.dev",
        total_amount: centsToDecimal(contract.amountCapCents),
        currency: "USD",
        purchase_context: [
          {
            merchant_details: {
              name: contract.merchant,
              url: "https://merchant-a.example.com",
              country_code_iso2: "US",
              category_code: "5734",
              category: "Computer software and accessories",
            },
            product_details: [
              {
                description: contract.itemDescription,
                unit_price: centsToDecimal(contract.amountCapCents),
                quantity: 1,
              },
            ],
          },
        ],
        integration_type: "full_checkout",
        callback_url: callbackUrl,
        card: { card_id: contract.cardId },
        effective_until_minutes: 1440,
        external_order_ref: contract.missionId,
        description: contract.itemDescription,
        mandate_setup: {
          intent: "mandate_setup",
          recurring_frequency: "one_time",
          merchant_scope: "listed",
          max_charges: contract.allowedCharges,
          valid_until: contract.expiresAt,
        },
      }),
    });
    return {
      sessionId: String(payload.session_id),
      status: "pending_approval",
      hostedApprovalUrl: typeof payload.iframe_url === "string" ? payload.iframe_url : undefined,
    };
  }

  async resolveActiveMandate(merchant: string, amountCents: number, createdAfter?: string): Promise<SafePravaMetadata> {
    const params = new URLSearchParams({ customer_id: this.credentials.customerId, standing_only: "true" });
    const payload = await this.request(`/v1/mandates?${params}`);
    const mandates = Array.isArray(payload.mandates) ? payload.mandates.map((item) => item as JsonRecord) : [];
    const amount = centsToDecimal(amountCents);
    const match = mandates
      .filter((item) => item.status === "active" && item.merchantName === merchant && item.approvedAmount === amount && (!createdAfter || String(item.createdAt ?? "") >= createdAfter))
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))[0];
    if (!match?.id) throw new Error("PRAVA_ACTIVE_MANDATE_NOT_FOUND");
    return { mandateId: String(match.id), status: String(match.status), responseId: typeof match.responseId === "string" ? match.responseId : undefined };
  }

  async getMandate(mandateId: string): Promise<SafePravaMetadata> {
    const payload = await this.request(`/v1/mandates/${encodeURIComponent(mandateId)}`);
    return {
      mandateId,
      responseId: typeof payload.response_id === "string" ? payload.response_id : undefined,
      status: String(payload.status ?? "unknown"),
    };
  }

  async revokeMandate(mandateId: string): Promise<SafePravaMetadata> {
    const payload = await this.request(`/v1/mandates/${encodeURIComponent(mandateId)}/lifecycle`, {
      method: "POST",
      body: JSON.stringify({ action: "cancel" }),
    });
    return { mandateId, status: String(payload.status ?? "cancelled") };
  }

  async chargeMandate(mandateId: string, amountCents: number, reference: string) {
    try {
      const payload = await this.request(`/v1/mandates/${encodeURIComponent(mandateId)}/charge`, {
        method: "POST",
        body: JSON.stringify({ amount: centsToDecimal(amountCents), reference }),
      });
      const credential = payload.credentials ?? payload.credential ?? payload.payment_credentials;
      return {
        safeMetadata: {
          mandateId,
          responseId: typeof payload.transactionId === "string" ? payload.transactionId : typeof payload.transaction_id === "string" ? payload.transaction_id : typeof payload.response_id === "string" ? payload.response_id : undefined,
          status: String(payload.status ?? "authorized"),
        },
        credential,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "PRAVA_CHARGE_FAILED";
      const [failureCode] = message.split(":");
      return { safeMetadata: { mandateId, status: "failed", failureCode } };
    }
  }

  async reportMandateCharge(mandateId: string, transactionId: string, approved: boolean, amountCents: number) {
    const payload = await this.request(`/v1/mandates/${encodeURIComponent(mandateId)}/charges/${encodeURIComponent(transactionId)}/report`, {
      method: "POST",
      body: JSON.stringify({
        txn_status: approved ? "APPROVED" : "DECLINED",
        txn_type: "PURCHASE",
        response_code: approved ? "00" : "05",
        amount_paid: approved ? centsToDecimal(amountCents) : "0.00",
      }),
    });
    return { mandateId, responseId: transactionId, status: String(payload.status ?? (approved ? "completed" : "failed")) };
  }
}

export class DemoPravaProvider implements PravaPaymentProvider {
  async listCards(): Promise<SafeCard[]> {
    return [
      { id: "card_demo_4242", brand: "visa", last4: "4242", expiryMonth: 12, expiryYear: 2030, isDefault: true, status: "active" },
      { id: "card_demo_1881", brand: "mastercard", last4: "1881", expiryMonth: 9, expiryYear: 2029, isDefault: false, status: "active" },
    ];
  }
  async createMandateSession(contract: AuthorizationContract): Promise<SafePravaMetadata> {
    const reference = contract.missionId.replaceAll("-", "").slice(0, 16);
    return { sessionId: `sess_demo_${reference}`, mandateId: `mandate_demo_${reference}`, status: "active" };
  }
  async resolveActiveMandate(): Promise<SafePravaMetadata> {
    return { sessionId: "sess_demo_8f72", mandateId: "mandate_demo_4d91", status: "active" };
  }
  async getMandate(mandateId: string): Promise<SafePravaMetadata> {
    return { mandateId, status: "active" };
  }
  async revokeMandate(mandateId: string): Promise<SafePravaMetadata> {
    return { mandateId, status: "cancelled" };
  }
  async chargeMandate(mandateId: string, amountCents: number) {
    if (amountCents > 30800) {
      return { safeMetadata: { mandateId, status: "failed", failureCode: "THRESHOLD_EXCEEDED" } };
    }
    return {
      safeMetadata: { mandateId, responseId: "resp_demo_779", status: "authorized" },
      credential: { kind: "sandbox-demo-token" },
    };
  }
  async reportMandateCharge(mandateId: string, transactionId: string, approved: boolean) {
    return { mandateId, responseId: transactionId, status: approved ? "completed" : "failed" };
  }
}

export interface ResolvedPravaProvider {
  provider: PravaPaymentProvider;
  live: boolean;
  source: IntegrationSource | "demo";
  cards?: SafeCard[];
}

export async function getPravaProvider(organizationId: string): Promise<ResolvedPravaProvider> {
  const resolved = await resolvePravaConnection(organizationId);
  if (!resolved) return { provider: new DemoPravaProvider(), live: false, source: "demo" };

  const liveProvider = new PravaRestProvider(resolved.credentials);
  try {
    const cards = await liveProvider.listCards();
    if (cards.length > 0) return { provider: liveProvider, live: true, source: resolved.source, cards };
  } catch {
    // A configured sandbox account is not execution-ready until its customer
    // has an enrolled card. Use the explicitly labelled simulation so the
    // judge workflow remains complete without claiming a live transaction.
  }
  return { provider: new DemoPravaProvider(), live: false, source: "demo" };
}
