import 'dotenv/config';
import { PrismaClient, ProductStatus, BlogStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// 1. Bypass Windows/Node SSL connection blocking (Fixes P1001)
const pool = new Pool({
    connectionString: process.env.DIRECT_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// 2. Prisma 7 strictly requires the adapter to be passed in
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {

    console.log('🌱 Seeding database...');

    // -- Categories --
    const spices = await prisma.category.upsert({
        where: { slug: 'spices' },
        update: {},
        create: { name: 'Spices', slug: 'spices' },
    });

    const teas = await prisma.category.upsert({
        where: { slug: 'teas' },
        update: {},
        create: { name: 'Teas', slug: 'teas' },
    });

    const oils = await prisma.category.upsert({
        where: { slug: 'oils' },
        update: {},
        create: { name: 'Oils', slug: 'oils' },
    });

    console.log('✅ Categories created');

    // ----------------------------------------------------------------
    // PRODUCTS
    // Each product has:
    //   - LOCAL variants   → LKR price, kraft/foil packaging
    //   - INTERNATIONAL variants → USD price, glass jar/gift tin
    // Stock is tracked at variant level but represents shared physical
    // inventory — your fulfilment team decrements from the same pile.
    // ----------------------------------------------------------------

    const cinnamon = await prisma.product.upsert({
        where: { slug: 'ceylon-true-cinnamon' },
        update: {
            latin: 'Cinnamomum verum',
            originLabel: 'Matale Hills',
            color: '#C58B58',
        },
        create: {
            name: 'Ceylon True Cinnamon',
            slug: 'ceylon-true-cinnamon',
            description: 'The world\'s finest cinnamon, grown in the lowlands of Sri Lanka. Delicate, sweet, and complex — nothing like the cassia sold in supermarkets.',
            categoryId: spices.id,
            certifications: ['ORGANIC', 'CEYLON_GI', 'FAIR_TRADE'],
            status: ProductStatus.ACTIVE,
            featured: true,
            market: 'BOTH',
            latin: 'Cinnamomum verum',
            originLabel: 'Matale Hills',
            color: '#C58B58',
            variants: {
                create: [
                    // LOCAL — LKR, kraft pouches
                    {
                        weight: 100,
                        price: 650,
                        sku: 'CIN-100-LK',
                        stock: 85,
                        market: 'LOCAL',
                        currency: 'LKR',
                        packagingType: 'kraft_pouch',
                        packagingDesc: 'Quality kraft stand-up resealable pouch',
                    },
                    {
                        weight: 250,
                        price: 1400,
                        sku: 'CIN-250-LK',
                        stock: 40,
                        market: 'LOCAL',
                        currency: 'LKR',
                        packagingType: 'foil_bag',
                        packagingDesc: 'Large resealable foil bag — value pack',
                    },
                    // INTERNATIONAL — USD, premium packaging
                    {
                        weight: 100,
                        price: 14.90,
                        sku: 'CIN-100-INT',
                        stock: 85,
                        market: 'INTERNATIONAL',
                        currency: 'USD',
                        packagingType: 'glass_jar_premium',
                        packagingDesc: 'Premium glass jar with embossed lid and wax seal',
                    },
                    {
                        weight: 250,
                        price: 32.00,
                        sku: 'CIN-250-INT',
                        stock: 40,
                        market: 'INTERNATIONAL',
                        currency: 'USD',
                        packagingType: 'gift_tin',
                        packagingDesc: 'Premium gift tin with ribbon and branded card',
                    },
                ],
            },
            images: {
                create: [
                    {
                        url: 'https://res.cloudinary.com/demo/image/upload/cinnamon.jpg',
                        altText: 'Ceylon cinnamon sticks',
                        position: 0,
                    },
                ],
            },
        },
    });

    const blackPepper = await prisma.product.upsert({
        where: { slug: 'malabar-black-pepper' },
        update: {
            latin: 'Piper nigrum',
            originLabel: 'Malabar Coast',
            color: '#2E2E2E',
        },
        create: {
            name: 'Malabar Black Pepper',
            slug: 'malabar-black-pepper',
            description: 'Bold, aromatic black pepper harvested at peak ripeness. Sun-dried to develop full pungency and complex floral notes.',
            categoryId: spices.id,
            certifications: ['ORGANIC', 'FAIR_TRADE'],
            status: ProductStatus.ACTIVE,
            featured: true,
            market: 'BOTH',
            latin: 'Piper nigrum',
            originLabel: 'Malabar Coast',
            color: '#2E2E2E',
            variants: {
                create: [
                    // LOCAL — LKR, kraft pouches
                    {
                        weight: 50,
                        price: 320,
                        sku: 'BPP-50-LK',
                        stock: 200,
                        market: 'LOCAL',
                        currency: 'LKR',
                        packagingType: 'kraft_pouch',
                        packagingDesc: 'Quality kraft stand-up resealable pouch',
                    },
                    {
                        weight: 100,
                        price: 580,
                        sku: 'BPP-100-LK',
                        stock: 150,
                        market: 'LOCAL',
                        currency: 'LKR',
                        packagingType: 'kraft_pouch',
                        packagingDesc: 'Quality kraft stand-up resealable pouch',
                    },
                    {
                        weight: 250,
                        price: 1250,
                        sku: 'BPP-250-LK',
                        stock: 60,
                        market: 'LOCAL',
                        currency: 'LKR',
                        packagingType: 'foil_bag',
                        packagingDesc: 'Large resealable foil bag — value pack',
                    },
                    // INTERNATIONAL — USD, premium packaging
                    {
                        weight: 50,
                        price: 6.99,
                        sku: 'BPP-50-INT',
                        stock: 200,
                        market: 'INTERNATIONAL',
                        currency: 'USD',
                        packagingType: 'glass_jar_premium',
                        packagingDesc: 'Premium glass jar with embossed lid and wax seal',
                    },
                    {
                        weight: 100,
                        price: 11.99,
                        sku: 'BPP-100-INT',
                        stock: 150,
                        market: 'INTERNATIONAL',
                        currency: 'USD',
                        packagingType: 'glass_jar_premium',
                        packagingDesc: 'Premium glass jar with embossed lid and wax seal',
                    },
                    {
                        weight: 250,
                        price: 24.99,
                        sku: 'BPP-250-INT',
                        stock: 60,
                        market: 'INTERNATIONAL',
                        currency: 'USD',
                        packagingType: 'gift_tin',
                        packagingDesc: 'Premium gift tin with ribbon and branded card',
                    },
                ],
            },
            images: {
                create: [
                    {
                        url: 'https://res.cloudinary.com/demo/image/upload/pepper.jpg',
                        altText: 'Malabar black pepper',
                        position: 0,
                    },
                ],
            },
        },
    });

    const ceylonTea = await prisma.product.upsert({
        where: { slug: 'single-estate-ceylon-black-tea' },
        update: {
            latin: 'Camellia sinensis',
            originLabel: 'Uva Highlands',
            color: '#7C3030',
        },
        create: {
            name: 'Single Estate Ceylon Black Tea',
            slug: 'single-estate-ceylon-black-tea',
            description: 'High-grown from the Uva highlands at 5,000ft. Bright, brisk, and distinctively floral. Served in the finest hotels worldwide.',
            categoryId: teas.id,
            certifications: ['ORGANIC', 'CEYLON_GI', 'HACCP'],
            status: ProductStatus.ACTIVE,
            featured: true,
            market: 'BOTH',
            latin: 'Camellia sinensis',
            originLabel: 'Uva Highlands',
            color: '#7C3030',
            variants: {
                create: [
                    // LOCAL — LKR, kraft pouches
                    {
                        weight: 50,
                        price: 450,
                        sku: 'TEA-50-LK',
                        stock: 95,
                        market: 'LOCAL',
                        currency: 'LKR',
                        packagingType: 'kraft_pouch',
                        packagingDesc: 'Quality kraft stand-up resealable pouch',
                    },
                    {
                        weight: 100,
                        price: 850,
                        sku: 'TEA-100-LK',
                        stock: 70,
                        market: 'LOCAL',
                        currency: 'LKR',
                        packagingType: 'kraft_pouch',
                        packagingDesc: 'Quality kraft stand-up resealable pouch',
                    },
                    {
                        weight: 250,
                        price: 1900,
                        sku: 'TEA-250-LK',
                        stock: 25,
                        market: 'LOCAL',
                        currency: 'LKR',
                        packagingType: 'foil_bag',
                        packagingDesc: 'Large resealable foil bag — value pack',
                    },
                    // INTERNATIONAL — USD, premium packaging
                    {
                        weight: 50,
                        price: 9.99,
                        sku: 'TEA-50-INT',
                        stock: 95,
                        market: 'INTERNATIONAL',
                        currency: 'USD',
                        packagingType: 'glass_jar_premium',
                        packagingDesc: 'Premium glass jar with embossed lid and wax seal',
                    },
                    {
                        weight: 100,
                        price: 17.99,
                        sku: 'TEA-100-INT',
                        stock: 70,
                        market: 'INTERNATIONAL',
                        currency: 'USD',
                        packagingType: 'glass_jar_premium',
                        packagingDesc: 'Premium glass jar with embossed lid and wax seal',
                    },
                    {
                        weight: 250,
                        price: 38.99,
                        sku: 'TEA-250-INT',
                        stock: 25,
                        market: 'INTERNATIONAL',
                        currency: 'USD',
                        packagingType: 'gift_tin',
                        packagingDesc: 'Premium gift tin with ribbon and branded card',
                    },
                ],
            },
            images: {
                create: [
                    {
                        url: 'https://res.cloudinary.com/demo/image/upload/tea.jpg',
                        altText: 'Ceylon black tea',
                        position: 0,
                    },
                ],
            },
        },
    });

    console.log('✅ Products created:', cinnamon.name, blackPepper.name, ceylonTea.name);

    // -- Admin user --
    // Credentials come from the environment so no publicly-known password ever
    // ships in source (SEC-03). In production the password is mandatory; locally
    // a clearly-insecure default is used and printed so devs can log in.
    const isProd = process.env.NODE_ENV === 'production';
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@aranyaceylon.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? (isProd ? '' : 'dev-only-admin-change-me');

    if (!adminPassword) {
        throw new Error(
            'SEED_ADMIN_PASSWORD is required to seed the admin user in production. ' +
            'Set it (and optionally SEED_ADMIN_EMAIL) before running the seed.',
        );
    }

    const { hash } = await import('@node-rs/bcrypt');
    const adminHash = await hash(adminPassword, 12);

    await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            name: 'Aranya Admin',
            email: adminEmail,
            passwordHash: adminHash,
            role: 'ADMIN',
            verified: true,
        },
    });

    // Never print the password. In dev, surface only the throwaway default.
    console.log(`✅ Admin user created: ${adminEmail}`);
    if (!isProd && !process.env.SEED_ADMIN_PASSWORD) {
        console.log('   (dev default password: dev-only-admin-change-me — set SEED_ADMIN_PASSWORD to override)');
    }

    // -- Sample blog post --
    await prisma.blog.upsert({
        where: { slug: 'why-ceylon-cinnamon-is-different' },
        update: {},
        create: {
            title: 'Why Ceylon Cinnamon Is Completely Different From What You Buy at the Supermarket',
            slug: 'why-ceylon-cinnamon-is-different',
            content: '# The Two Cinnamons\n\nMost cinnamon sold globally is **cassia** (*Cinnamomum cassia*), grown in China and Indonesia...',
            authorId: (await prisma.user.findUnique({ where: { email: adminEmail } }))!.id,
            tags: ['cinnamon', 'ceylon', 'spice-guide'],
            status: BlogStatus.PUBLISHED,
            publishedAt: new Date(),
            seoTitle: 'Ceylon vs Cassia Cinnamon: The Complete Guide',
            seoDesc: 'Discover why Ceylon true cinnamon is prized worldwide and how it differs from the cassia you find in supermarkets.',
        },
    });

    console.log('✅ Blog post created');
    console.log('\n🌿 Seed complete!');
    console.log('   Local variants (LKR):         9 variants across 3 products');
    console.log('   International variants (USD):  9 variants across 3 products');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });