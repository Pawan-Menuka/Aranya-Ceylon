import 'dotenv/config';
// Validate environment FIRST — importing this exits the process in production
// if a required secret is missing/weak, before any server or DB setup runs.
import { env } from './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import { SHARED_VERSION } from '@aranya/shared';
import { ZodError } from 'zod';
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
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
import adminRoutes from './routes/admin.routes.js';
import contactRoutes from './routes/contact.routes.js';
import wholesaleRoutes from './routes/wholesale.routes.js';
import devSeedRoutes from './routes/dev-seed.routes.js';
import { startAllJobs } from './jobs/scheduler.js';


const app = express();
const PORT = process.env.PORT ?? 4000;

// Behind a reverse proxy (Render/Railway/Fly/Nginx) the client IP arrives in
// X-Forwarded-For. Trust the first hop so rate limiting keys on the real IP.
if (process.env.NODE_ENV === 'production') {
    // Number of proxy hops in front of the app: Railway alone = 1, with
    // Cloudflare added = 2. Configurable so adding Cloudflare is a config change.
    app.set('trust proxy', env.TRUST_PROXY);
}

// 1. Connect via Neon's serverless driver (#28). The previous node-postgres
// persistent Pool against Neon's pooler dropped connections ("Server has
// closed the connection" / P1017) — fine at boot, dead by the first query.
// The serverless driver is built for Neon + serverless hosts (Vercel) and
// recovers connections transparently. It always encrypts to Neon, so it also
// covers the TLS-verification concern (#11). In Node we must supply a
// WebSocket implementation (built-in on edge runtimes).
neonConfig.webSocketConstructor = ws;

// 2. Prisma 7 Neon adapter — manages its own connection pool internally.
const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// ⚠ ORDERING IS INTENTIONAL — do not move. Webhook routes are mounted BEFORE
// express.json() because Stripe signature verification needs the raw request
// body (the route applies its own express.raw()). A JSON parser running first
// would consume/transform the body and break signature checks. The webhook
// handlers verify their own gateway signatures, so they don't rely on CORS.
// Browser-facing routes are mounted AFTER helmet()/cors() below — never add
// one above this line.
app.use('/webhooks', webhookRoutes);
app.use(helmet());
// Fail CLOSED: only NODE_ENV === 'development' relaxes CORS. An unset or
// misspelled NODE_ENV must behave like production, never like development.
const isDev = process.env.NODE_ENV === 'development';
const _allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',').map(s => s.trim());
app.use(cors({
    origin: (origin, cb) => {
        if (origin && _allowedOrigins.includes(origin)) return cb(null, true);
        // Development only: allow any origin, incl. file:// pages (null origin)
        if (isDev) return cb(null, true);
        // Tag the error so the global handler returns 403 instead of 500. `expose`
        // marks the message as safe to relay to the client (see error handler).
        const err = new Error('CORS: origin not allowed') as Error & { status?: number; expose?: boolean };
        err.status = 403;
        err.expose = true;
        cb(err);
    },
    credentials: true,
}));
app.use(express.json({ limit: '512kb' })); // 10kb was too small for admin blog/recipe bodies
app.use(cookieParser());
app.use(resolveMarket);
// 30s per-request inactivity timeout on all browser-facing routes. Mounted
// AFTER the webhook routes (above) so gateway deliveries are never cut off.
app.use(requestTimeout(30_000));

// Global IP rate limit on all browser-facing routes below. Mounted AFTER the
// webhook routes (above) so payment-gateway retries are never throttled.
app.use(globalLimiter);

// --- Routes ---
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
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
    // Controllers that call schema.parse() directly (cart, checkout, contact,
    // wholesale, admin) throw a ZodError, which has no .status — without this
    // branch it would fall through to a 500 for what is really a 400. Surface
    // field-level errors so the client can show which input was rejected.
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: 'Validation failed',
            errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
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
        ...(isDev && { details: err.message, stack: err.stack }),
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
    const server = app.listen(PORT, () => {
        console.log(`🌿 Aranya Ceylon API running on http://localhost:${PORT}`);
        // NOTE: cron jobs run in EVERY instance. Safe at one instance; before
        // scaling horizontally, gate startAllJobs() behind a leader-election
        // flag (e.g. only run on instance 0) so jobs don't double-fire.
        startAllJobs(); // Start after DB connection confirmed
    });

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