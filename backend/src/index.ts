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


const app = express();
const PORT = process.env.PORT ?? 4000;

// 1. Set up the connection pool for Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
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
app.use(cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
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
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message, stack: err.stack });
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
    });
});