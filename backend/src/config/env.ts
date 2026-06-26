/**
 * Centralised, validated environment configuration.
 *
 * Importing this module *is* the validation: the schema is parsed at load time,
 * so a misconfigured deploy fails fast at boot instead of silently running with
 * broken security. The catastrophic case this prevents: an unset
 * JWT_ACCESS_SECRET previously fell through `process.env.JWT_ACCESS_SECRET!` and
 * signed every access token with the literal bytes of the string "undefined" —
 * a forgeable key, with no error anywhere.
 *
 * Strictness is scoped by NODE_ENV:
 *   - production: required secrets MUST be present (and JWT secret >= 32 chars);
 *     payment-gateway keys MUST be present when PAYMENTS_MODE=live. On failure we
 *     print every problem and exit(1) — the process must not come up half-secure.
 *   - development / test: missing secrets fall back to clearly-marked insecure
 *     defaults so local runs and the (fully-mocked) test suite never break. The
 *     dangerous scenario is a misconfigured *production* deploy, not localhost.
 */
import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

// Dev/test fallbacks — NEVER used in production (the schema requires real values
// there). Marked obviously so they can't be mistaken for a real secret in a log.
const DEV_JWT_SECRET = 'dev-only-insecure-jwt-secret-change-me';
const DEV_DATABASE_URL = 'postgresql://dev:dev@localhost:5432/dev';

const envSchema = z
    .object({
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
        PORT: z.coerce.number().int().positive().default(4000),

        // Always required (with a dev/test fallback applied below).
        DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
        JWT_ACCESS_SECRET: z
            .string()
            .min(isProduction ? 32 : 1, 'JWT_ACCESS_SECRET must be at least 32 characters in production'),

        // Sensible defaults.
        JWT_ACCESS_EXPIRY: z.string().default('15m'),
        FRONTEND_URL: z.string().min(1).default('http://localhost:3000'),
        PAYMENTS_MODE: z.enum(['stub', 'live']).default('stub'),
        ENABLE_DEV_ROUTES: z.string().optional(),

        // Proxy / client-IP resolution. TRUST_PROXY is the number of proxy hops
        // in front of the app (Railway alone = 1; with Cloudflare added = 2).
        // TRUST_CLOUDFLARE=true makes rate limiting + audit logs key on the
        // CF-Connecting-IP header (the real client) instead of an edge IP.
        TRUST_PROXY: z.coerce.number().int().min(0).default(1),
        TRUST_CLOUDFLARE: z.string().optional().transform((v) => v === 'true'),

        // Payment gateways — required only when PAYMENTS_MODE=live (see superRefine).
        STRIPE_SECRET_KEY: z.string().optional(),
        STRIPE_WEBHOOK_SECRET: z.string().optional(),
        PAYHERE_MERCHANT_ID: z.string().optional(),
        PAYHERE_MERCHANT_SECRET: z.string().optional(),
    })
    // Unknown keys (Cloudinary, Resend, etc.) pass through untouched — this
    // validator owns only the security-critical surface, not every var.
    .passthrough()
    .superRefine((env, ctx) => {
        if (env.PAYMENTS_MODE === 'live') {
            const liveKeys = [
                'STRIPE_SECRET_KEY',
                'STRIPE_WEBHOOK_SECRET',
                'PAYHERE_MERCHANT_ID',
                'PAYHERE_MERCHANT_SECRET',
            ] as const;
            for (const key of liveKeys) {
                if (!env[key]) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [key],
                        message: `${key} is required when PAYMENTS_MODE=live`,
                    });
                }
            }
        }
    });

// Apply dev/test fallbacks before validation so localhost and the test suite
// don't need real secrets, while production stays strict.
const rawEnv: NodeJS.ProcessEnv = { ...process.env };
if (!isProduction) {
    rawEnv.JWT_ACCESS_SECRET ??= DEV_JWT_SECRET;
    rawEnv.DATABASE_URL ??= DEV_DATABASE_URL;
}

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
    console.error('\n❌ Invalid environment configuration — refusing to start:\n');
    for (const issue of parsed.error.issues) {
        console.error(`   • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    console.error('\nSet the missing/invalid variables (see backend/.env.example) and restart.\n');
    process.exit(1);
}

export const env = parsed.data;
