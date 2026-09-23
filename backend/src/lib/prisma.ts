import 'dotenv/config';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';
import { env } from '../config/env.js';

function createAdapter() {
    if (env.DATABASE_ADAPTER === 'pg') {
        return new PrismaPg({ connectionString: env.DATABASE_URL });
    }

    // Neon's serverless driver needs a WebSocket implementation in Node. It
    // remains the default adapter for normal development and production use.
    neonConfig.webSocketConstructor = ws;
    return new PrismaNeon({ connectionString: env.DATABASE_URL });
}

export const prisma = new PrismaClient({
    adapter: createAdapter(),
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
