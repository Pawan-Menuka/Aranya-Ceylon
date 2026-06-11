import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { SHARED_VERSION } from '@aranya/shared';
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import blogRoutes from './routes/blog.routes.js';
import categoryRoutes from './routes/category.routes.js';
import marketRoutes from './routes/market.routes.js';
import cartRoutes from './routes/cart.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import { resolveMarket } from './middleware/market.js';
import adminRoutes from './routes/admin.routes.js';
import devSeedRoutes from './routes/dev-seed.routes.js';
import { startAllJobs } from './jobs/scheduler.js';


const app = express();
const PORT = process.env.PORT ?? 4000;

// Behind a reverse proxy (Render/Railway/Fly/Nginx) the client IP arrives in
// X-Forwarded-For. Trust the first hop so rate limiting keys on the real IP.
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// 1. Set up the connection pool for Neon
// rejectUnauthorized: true verifies Neon's TLS certificate chain (#11).
// Neon serves publicly-trusted certs, so this validates against Node's CA
// store and prevents man-in-the-middle on the DB connection. The previous
// `false` accepted ANY certificate — encrypted but unauthenticated.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true
    }
});

// 2. Create the Prisma 7 Adapter for pg
const adapter = new PrismaPg(pool as any);

export const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

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
        cb(new Error('CORS: origin not allowed'));
    },
    credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(resolveMarket);

// --- Routes ---
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/blog', blogRoutes);
app.use('/categories', categoryRoutes);
app.use('/market', marketRoutes);
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/admin', adminRoutes);
// Dev-only seed endpoint — requires explicit opt-in, never just NODE_ENV
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

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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
    app.listen(PORT, () => {
        console.log(`🌿 Aranya Ceylon API running on http://localhost:${PORT}`);
        startAllJobs(); // Start after DB connection confirmed
    });
});