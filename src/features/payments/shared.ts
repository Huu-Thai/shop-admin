/** Mirrors the shop API's REQUIRED_CREDENTIALS (payments/providers/registry.ts). */
export const PROVIDER_CODES = ['STRIPE', 'PAYPAL', 'VNPAY', 'MOMO', 'COD'] as const;
export type ProviderCode = (typeof PROVIDER_CODES)[number];

export const CREDENTIAL_KEYS: Record<ProviderCode, string[]> = {
  STRIPE: ['secretKey', 'publishableKey', 'webhookSecret'],
  PAYPAL: ['clientId', 'clientSecret', 'webhookId'],
  VNPAY: ['tmnCode', 'hashSecret'],
  MOMO: ['partnerCode', 'accessKey', 'secretKey'],
  COD: [],
};

/** Which credential values look like secrets (masked while typing). */
export const isSecret = (key: string) => /secret|key/i.test(key) && key !== 'publishableKey';

/** Missing credential keys for a provider (all are required when (re)setting credentials). */
export function missingCredentials(code: ProviderCode, values: Record<string, string>): string[] {
  return CREDENTIAL_KEYS[code].filter((k) => !values[k]?.trim());
}

/** "us, VN ,de" → ["US","VN","DE"]; invalid codes are reported. */
export function parseCountries(text: string): { codes: string[]; invalid: string[] } {
  const parts = text
    .split(/[\s,;]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
  return {
    codes: [...new Set(parts.filter((p) => /^[A-Z]{2}$/.test(p)))],
    invalid: parts.filter((p) => !/^[A-Z]{2}$/.test(p)),
  };
}
