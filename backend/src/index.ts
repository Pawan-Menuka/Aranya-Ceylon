import 'dotenv/config';
// Validate environment FIRST — importing this exits the process in production
// if a required secret is missing/weak, before any server or DB setup runs.
import { env } from './config/env.js';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { SHARED_VERSION } from '@aranya/shared';
import { ZodError } from 'zod';
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import searchRoutes from './routes/search.routes.js';
import blogRoutes from './routes/blog.routes.js';
import categoryRoutes from './routes/category.routes.js';
import marketRoutes from './routes/market.routes.js';
import cartRoutes from './routes/cart.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import orderRoutes from './routes/order.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import recipeRoutes from './routes/recipe.routes.js';
import giftRoutes from './routes/gift.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import { resolveMarket } from './middleware/market.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { requestTimeout } from './middleware/timeout.js';
import { publicReadPolicy } from './middleware/publicReadPolicy.js';
import { browserCors } from './middleware/browserCors.js';
import { requestMetricsFromEnv } from './middleware/requestMetrics.js';
import { bffClientIdentityFromEnv } from './middleware/bffClientIdentity.js';
import { apiListenHostFromEnv } from './lib/listenHost.js';
import adminRoutes from './routes/admin.routes.js';
import contactRoutes from './routes/contact.routes.js';
import wholesaleRoutes from './routes/wholesale.routes.js';
import devSeedRoutes from './routes/dev-seed.routes.js';
import { startAllJobs } from './jobs/scheduler.js';
import { prisma } from './lib/prisma.js';
import { outboxEnabled } from './lib/outbox.js';
import { distributedJobsEnabled } from './jobs/jobLease.js';
import { outboxWorkerEnabled } from './jobs/outboxWorker.js';
import { dashboardRollupsEnabled } from './services/dashboard-rollups.js';


// Backstop for a promise nobody awaited or caught. Node's default is to
// terminate the process, which turns one stray rejection (a fire-and-forget
// send, a handler missing asyncHandler) into an outage for every customer.
// Route handlers are still expected to be wrapped — this only keeps the API
// up, and loud, if one is missed.
process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
});

const app = express();
const PORT = process.env.PORT ?? 4000;
// Validate the strict BFF rollout before opening the listener or connecting to the database.
const bffClientIdentity = bffClientIdentityFromEnv(process.env);
// Browsers reach this API only through the storefront's BFF, which strips
// forwarded-IP headers. Unless that BFF signs the visitor's address (and this
// API requires it), every shopper arrives from the storefront server's own IP
// and shares ONE bucket per rate limiter — 10 sign-ins per 15 minutes for the
// whole site. Not enforced, because the hosting topology decides how the
// client IP reaches the BFF; see docs/operations/deployment-checklist.md.
if (process.env.NODE_ENV === 'production' && process.env.BFF_CLIENT_IP_REQUIRED !== 'true') {
    console.warn(
        '⚠ BFF client identity is not enforced (BFF_CLIENT_IP_SECRET + BFF_CLIENT_IP_REQUIRED=true). '
        + 'Rate limits and audit-log IPs will key on the storefront server, not on individual visitors.',
    );
}
const API_HOST = apiListenHostFromEnv(process.env);
// Validate optional background features before any listener or database connection.
const durableOutbox = outboxEnabled();
if (distributedJobsEnabled() && !durableOutbox) throw new Error('Distributed jobs require OUTBOX_ENABLED');
if (outboxWorkerEnabled()) throw new Error('Run the outbox worker in its dedicated process; disable OUTBOX_WORKER_ENABLED in the API');
dashboardRollupsEnabled();

// Behind a reverse proxy (Render/Railway/Fly/Nginx) the client IP arrives in
// X-Forwarded-For. Trust the first hop so rate limiting keys on the real IP.
if (process.env.NODE_ENV === 'production') {
    // Number of proxy hops in front of the app: Railway alone = 1, with
    // Cloudflare added = 2. Configurable so adding Cloudflare is a config change.
    app.set('trust proxy', env.TRUST_PROXY);
}

const requestMetrics = requestMetricsFromEnv(process.env);
if (requestMetrics) app.use(requestMetrics);

// ⚠ ORDERING IS INTENTIONAL — do not move. Webhook routes are mounted BEFORE
// express.json() because Stripe signature verification needs the raw request
// body (the route applies its own express.raw()). A JSON parser running first
// would consume/transform the body and break signature checks. The webhook
// handlers verify their own gateway signatures, so they don't rely on CORS.
// Browser-facing routes are mounted AFTER helmet()/cors() below — never add
// one above this line.
app.use('/webhooks', webhookRoutes);
app.use(helmet());
// gzip/brotli-negotiated compression on every response (perf audit #14).
// Default 1kb threshold means small acks/health-checks are left uncompressed
// rather than paying the CPU cost for no size benefit.
app.use(compression());
// Fail CLOSED: only NODE_ENV === 'development' relaxes CORS. An unset or
// misspelled NODE_ENV must behave like production, never like development.
app.use(browserCors());
// Gateway webhooks above retain their own signature verification. Browser
// attribution is checked before any rate-limit key or audit IP is resolved.
if (bffClientIdentity) app.use(bffClientIdentity);
app.use(express.json({ limit: '512kb' })); // 10kb was too small for admin blog/recipe bodies
app.use(cookieParser());
app.use(resolveMarket);
app.use(publicReadPolicy);
// 30s per-request inactivity timeout on all browser-facing routes. Mounted
// AFTER the webhook routes (above) so gateway deliveries are never cut off.
app.use(requestTimeout(30_000));

// Global IP rate limit on all browser-facing routes below. Mounted AFTER the
// webhook routes (above) so payment-gateway retries are never throttled.
app.use(globalLimiter);

// --- Routes ---
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/search', searchRoutes);
app.use('/blog', blogRoutes);
app.use('/categories', categoryRoutes);
app.use('/market', marketRoutes);
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/orders', orderRoutes);
app.use('/wishlist', wishlistRoutes);
app.use('/recipes', recipeRoutes);
app.use('/gifts', giftRoutes);
app.use('/admin', adminRoutes);
app.use('/contact', contactRoutes);
app.use('/wholesale', wholesaleRoutes);
// Dev-only seed endpoint — requires explicit opt-in via ENABLE_DEV_ROUTES=true
if (process.env.ENABLE_DEV_ROUTES === 'true') {
    app.use('/dev', devSeedRoutes);
}

// --- Health check ---
app.get('/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected',
            shared: SHARED_VERSION,
            env: process.env.NODE_ENV ?? 'development',
        });
    } catch {
        res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});

app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error & { status?: number; expose?: boolean }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // The response is already gone — typically the 30s request timeout answered
    // 503 and the handler failed afterwards. Writing again throws "headers
    // already sent" inside this handler, so just record it. (Work that
    // completes after the timeout still takes effect; the client was told to
    // retry, which the idempotent order paths tolerate.)
    if (res.headersSent) {
        console.error('[ERROR after response sent]', err);
        return;
    }
    // Controllers that call schema.parse() directly (cart, checkout, contact,
    // wholesale, admin) throw a ZodError, which has no .status — without this
    // branch it would fall through to a 500 for what is really a 400. Surface
    // field-level errors so the client can show which input was rejected.
    // Duck-typed (name + issues array), NOT just `instanceof` — the backend and
    // shared package can resolve to different zod instances, and instanceof
    // silently fails across them, reverting shared-schema (cart/checkout) parses
    // to 500s (BUG-06).
    const zodLike = err as { name?: string; issues?: Array<{ path: Array<string | number>; message: string }> };
    if (err instanceof ZodError || (zodLike.name === 'ZodError' && Array.isArray(zodLike.issues))) {
        const issues = zodLike.issues ?? [];
        return res.status(400).json({
            error: 'Validation failed',
            errors: issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
    }

    // Use the status the error was tagged with (e.g. 403 for CORS), default 500
    const status = typeof err.status === 'number' ? err.status : 500;
    if (status < 500) {
        // Client errors. Only relay the message when it's explicitly marked safe
        // (expose) — an arbitrary library error carrying status<500 must not leak
        // its internal message to clients (SEC-11).
        return res.status(status).json({ error: err.expose ? err.message : 'Request rejected' });
    }
    console.error('[ERROR]', err);
    // Never leak internals (message/stack) outside development
    res.status(500).json({
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: err.message, stack: err.stack }),
    });
});

async function connectDB() {
    try {
        await prisma.$connect();
        console.log('🗄️  Database connected');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}

connectDB().then(() => {
    const onListening = () => {
        console.log(`🌿 Aranya Ceylon API running on ${API_HOST ?? 'default interfaces'}:${PORT}`);
        // Scheduler startup requires the explicit instance-enable flag. Its
        // noOverlap guard is local to this process, not a distributed lock.
        startAllJobs(); // Start after DB connection confirmed
    };
    const server = API_HOST ? app.listen(Number(PORT), API_HOST, onListening) : app.listen(PORT, onListening);

    // Connection-level timeouts (slow-loris / dead-peer protection).
    // keepAliveTimeout is raised above the typical proxy idle timeout so the
    // upstream (Railway) closes first — avoids spurious 502s on reused sockets —
    // and headersTimeout is kept just above it (Node requires headers >= keepAlive).
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;

    // --- Graceful shutdown ---
    // PaaS platforms send SIGTERM on rolling restarts/deploys. Stop accepting
    // new connections, then release the DB pool so we don't leak connections.
    let shuttingDown = false;
    const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`\n${signal} received — shutting down gracefully…`);
        server.close(async () => {
            try {
                await prisma.$disconnect(); // closes the Neon adapter's pool
                console.log('👋 Closed HTTP server and database connection');
                process.exit(0);
            } catch (err) {
                console.error('Error during shutdown:', err);
                process.exit(1);
            }
        });
        // Failsafe: force-exit if connections don't drain in time.
        setTimeout(() => {
            console.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10_000).unref();
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
});
