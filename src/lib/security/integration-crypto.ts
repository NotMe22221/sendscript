import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function deriveKey(keyMaterial: string) {
  if (keyMaterial.length < 24) throw new Error("INTEGRATION_ENCRYPTION_NOT_CONFIGURED");
  return createHash("sha256").update("SpendScript organization integrations\0").update(keyMaterial).digest();
}

export function encryptIntegrationCredentials(value: unknown, keyMaterial: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(keyMaterial), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptIntegrationCredentials<T>(envelope: string, keyMaterial: string): T {
  const [version, ivValue, tagValue, ciphertextValue, extra] = envelope.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !ciphertextValue || extra) throw new Error("INTEGRATION_CREDENTIALS_INVALID");
  try {
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(keyMaterial), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    throw new Error("INTEGRATION_CREDENTIALS_INVALID");
  }
}

