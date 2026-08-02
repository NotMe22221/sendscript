function value(name: string, fallback?: string) {
  return process.env[name] || fallback;
}

export const config = {
  get appUrl() { return value("NEXT_PUBLIC_APP_URL", "http://localhost:3000")!; },
  get supabaseUrl() { return value("NEXT_PUBLIC_SUPABASE_URL"); },
  get supabasePublishableKey() { return value("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"); },
  get supabaseServiceRoleKey() { return value("SUPABASE_SERVICE_ROLE_KEY"); },
  get integrationEncryptionKey() { return value("INTEGRATION_ENCRYPTION_KEY") || value("SUPABASE_SERVICE_ROLE_KEY"); },
  get openAiKey() { return value("OPENAI_API_KEY"); },
  get openAiModel() { return value("OPENAI_MODEL", "gpt-5.6")!; },
  get pravaBaseUrl() { return value("PRAVA_BASE_URL", "https://sandbox.api.prava.space")!; },
  get pravaSecretKey() { return value("PRAVA_SECRET_KEY"); },
  get pravaPublishableKey() { return value("NEXT_PUBLIC_PRAVA_PUBLISHABLE_KEY"); },
  get pravaCustomerId() { return value("PRAVA_CUSTOMER_ID"); },
};

export const readiness = {
  get supabase() { return Boolean(config.supabaseUrl && config.supabasePublishableKey && config.supabaseServiceRoleKey); },
  get openai() { return Boolean(config.openAiKey); },
  get prava() { return Boolean(config.pravaSecretKey && config.pravaPublishableKey && config.pravaCustomerId); },
};
