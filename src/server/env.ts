import 'server-only';
import { z } from 'zod';

const schema = z.object({
  /** Origin of the shop API, e.g. https://api.shop.example (without /api/v1). */
  SHOP_API_URL: z.url({ protocol: /^https?$/ }),
  /** ≥ 32 characters; encrypts the session cookie (openssl rand -hex 32). */
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** Read-only demo: every change is refused in the gateway and in Server Actions. */
  DEMO_MODE: z
    .enum(['true', 'false', '1', '0', ''])
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  /** Shown on the sign-in page in demo mode (a public, read-only account). */
  DEMO_EMAIL: z.string().optional(),
  DEMO_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated server configuration (read on first use; a misconfiguration names every problem). */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success)
    throw new Error(
      `Invalid shop-admin configuration:\n${parsed.error.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.SHOP_API_URL.startsWith('https://'))
    console.warn('SHOP_API_URL is not https: tokens travel in clear text');
  cached = parsed.data;
  return cached;
}

export const apiBase = () => `${env().SHOP_API_URL.replace(/\/+$/, '')}/api/v1`;

/** Read-only demo mode (DEMO_MODE=true). */
export const isDemo = () => env().DEMO_MODE;
export const DEMO_REFUSAL = 'This is a read-only demo: changes are switched off.';
