const sensitiveKeys = new Set(["pan", "cvv", "cvc", "dynamic_cvv", "session_token", "token", "credentials", "credential", "payment_credentials"]);

export function redactPaymentData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactPaymentData);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      sensitiveKeys.has(key.toLowerCase()) ? "[REDACTED]" : redactPaymentData(nested),
    ]),
  );
}
