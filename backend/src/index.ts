import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { SHARED_VERSION } from '@aranya/shared';

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// 1. Set up the connection pool for Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Bypasses local strict SSL connection drops
    }
});

// 2. Create the Prisma 7 Adapter
const adapter = new PrismaPg(pool);

// 3. Initialize Prisma with BOTH the adapter and your logging preferences
export const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Verify DB connection on startup
async function connectDB() {
    try {
        await prisma.$connect();
        console.log('🗄️  Database connected');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1); // Don't start the server with a broken DB connection
    }
}

const app = express();
const PORT = process.env.PORT ?? 4000;

// --- Security middleware (applied before all routes) ---
app.use(helmet());           // Sets 11 security headers automatically
app.use(cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,       // Required for HttpOnly cookie auth later
}));
app.use(express.json({ limit: '10kb' })); // Body size limit — prevents large payload attacks

// --- Health check (used by Railway, CI, and uptime monitors) ---
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

// --- Global error handler (must be last, 4 params signature required by Express) ---
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🌿 Aranya Ceylon API running on http://localhost:${PORT}`);
    });
});