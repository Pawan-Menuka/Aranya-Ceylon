import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

const integrationPrefix = `it_${process.pid}_${Date.now()}`;
let sequence = 0;

export { prisma };

export function uniqueTestId(label: string) {
    sequence += 1;
    return `${integrationPrefix}_${sequence}_${label}`;
}

export function assertIntegrationDatabase() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is required for integration tests');

    const databaseName = new URL(databaseUrl).pathname.slice(1).toLowerCase();
    if (!databaseName.includes('integration')) {
        throw new Error(`Refusing to clean non-integration database: ${databaseName}`);
    }
    if (process.env.DATABASE_ADAPTER !== 'pg') {
        throw new Error('Integration tests require DATABASE_ADAPTER=pg');
    }
}

export async function resetIntegrationDatabase() {
    assertIntegrationDatabase();

    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> '_prisma_migrations'
    `;

    if (tables.length === 0) {
        throw new Error('Integration database has no application tables; run prisma migrate deploy first');
    }

    const quotedTables = tables
        .map(({ tablename }) => `"public"."${tablename.replaceAll('"', '""')}"`)
        .join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`);
}

export async function createCatalogItem(params: {
    prefix: string;
    name?: string;
    stock: number;
    price?: string;
    weight?: number;
    productSlug?: string;
}) {
    const category = await prisma.category.create({
        data: {
            name: `${params.prefix} category`,
            slug: `${params.prefix}-category`,
        },
    });
    const product = await prisma.product.create({
        data: {
            name: params.name ?? `${params.prefix} product`,
            slug: params.productSlug ?? `${params.prefix}-product`,
            description: 'Integration-test product',
            categoryId: category.id,
            certifications: [],
            status: 'ACTIVE',
            market: 'INTERNATIONAL',
            variants: {
                create: {
                    weight: params.weight ?? 100,
                    price: params.price ?? '10.00',
                    sku: `${params.prefix}-sku`,
                    stock: params.stock,
                    market: 'INTERNATIONAL',
                    currency: 'USD',
                },
            },
        },
        include: { variants: true },
    });

    return { category, product, variant: product.variants[0]! };
}

export function checkoutRequest(guestToken: string, guestEmail: string): Request {
    return {
        cookies: { guestCartToken: guestToken },
        market: 'INTERNATIONAL',
        body: {
            guestEmail,
            shippingAddress: {
                firstName: 'Integration',
                lastName: 'Test',
                line1: '1 Test Street',
                city: 'Colombo',
                postalCode: '00100',
                country: 'US',
            },
            shippingMethod: 'STANDARD',
            saveAddress: false,
            giftWrap: false,
        },
    } as unknown as Request;
}

export function responseRecorder() {
    const result: { statusCode: number; body: unknown } = { statusCode: 200, body: undefined };
    const response = {
        status(code: number) {
            result.statusCode = code;
            return response;
        },
        json(body: unknown) {
            result.body = body;
            return response;
        },
    } as unknown as Response;

    return { response, result };
}

export async function waitForBlockedVariantUpdate(timeoutMs = 5_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const rows = await prisma.$queryRaw<Array<{ blocked: bigint }>>`
            SELECT COUNT(*) AS blocked
            FROM pg_stat_activity
            WHERE datname = current_database()
              AND wait_event_type = 'Lock'
              AND query ILIKE '%Variant%'
        `;
        if (Number(rows[0]?.blocked ?? 0) > 0) return;
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error('Timed out waiting for the checkout transaction to block on the variant row');
}
