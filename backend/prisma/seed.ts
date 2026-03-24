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
    // ... the rest of the file stays exactly the same
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

    // -- Products --
    const cinnamon = await prisma.product.upsert({
        where: { slug: 'ceylon-true-cinnamon' },
        update: {},
        create: {
            name: 'Ceylon True Cinnamon',
            slug: 'ceylon-true-cinnamon',
            description: 'The world\'s finest cinnamon, grown in the lowlands of Sri Lanka. Delicate, sweet, and complex — nothing like the cassia sold in supermarkets.',
            categoryId: spices.id,
            certifications: ['ORGANIC', 'CEYLON_GI', 'FAIR_TRADE'],
            status: ProductStatus.ACTIVE,
            featured: true,
            variants: {
                create: [
                    { weight: 50, price: 8.99, sku: 'CIN-50', stock: 120 },
                    { weight: 100, price: 15.99, sku: 'CIN-100', stock: 85 },
                    { weight: 250, price: 34.99, sku: 'CIN-250', stock: 40 },
                ],
            },
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/demo/image/upload/cinnamon.jpg', altText: 'Ceylon cinnamon sticks', position: 0 },
                ],
            },
        },
    });

    const blackPepper = await prisma.product.upsert({
        where: { slug: 'malabar-black-pepper' },
        update: {},
        create: {
            name: 'Malabar Black Pepper',
            slug: 'malabar-black-pepper',
            description: 'Bold, aromatic black pepper harvested at peak ripeness. Sun-dried to develop full pungency and complex floral notes.',
            categoryId: spices.id,
            certifications: ['ORGANIC', 'FAIR_TRADE'],
            status: ProductStatus.ACTIVE,
            featured: true,
            variants: {
                create: [
                    { weight: 50, price: 6.99, sku: 'BPP-50', stock: 200 },
                    { weight: 100, price: 11.99, sku: 'BPP-100', stock: 150 },
                    { weight: 250, price: 24.99, sku: 'BPP-250', stock: 60 },
                ],
            },
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/demo/image/upload/pepper.jpg', altText: 'Malabar black pepper', position: 0 },
                ],
            },
        },
    });

    const ceylonTea = await prisma.product.upsert({
        where: { slug: 'single-estate-ceylon-black-tea' },
        update: {},
        create: {
            name: 'Single Estate Ceylon Black Tea',
            slug: 'single-estate-ceylon-black-tea',
            description: 'High-grown from the Uva highlands at 5,000ft. Bright, brisk, and distinctively floral. Served in the finest hotels worldwide.',
            categoryId: teas.id,
            certifications: ['ORGANIC', 'CEYLON_GI', 'HACCP'],
            status: ProductStatus.ACTIVE,
            featured: true,
            variants: {
                create: [
                    { weight: 50, price: 9.99, sku: 'TEA-50', stock: 95 },
                    { weight: 100, price: 17.99, sku: 'TEA-100', stock: 70 },
                    { weight: 250, price: 38.99, sku: 'TEA-250', stock: 25 },
                ],
            },
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/demo/image/upload/tea.jpg', altText: 'Ceylon black tea', position: 0 },
                ],
            },
        },
    });

    console.log('✅ Products created:', cinnamon.name, blackPepper.name, ceylonTea.name);

    // -- Admin user --
    const bcrypt = await import('bcryptjs');
    const adminHash = await bcrypt.hash('Admin@123!', 12);

    await prisma.user.upsert({
        where: { email: 'admin@aranyaceylon.com' },
        update: {},
        create: {
            name: 'Aranya Admin',
            email: 'admin@aranyaceylon.com',
            passwordHash: adminHash,
            role: 'ADMIN',
            verified: true,
        },
    });

    console.log('✅ Admin user created: admin@aranyaceylon.com / Admin@123!');

    // -- Sample blog post --
    await prisma.blog.upsert({
        where: { slug: 'why-ceylon-cinnamon-is-different' },
        update: {},
        create: {
            title: 'Why Ceylon Cinnamon Is Completely Different From What You Buy at the Supermarket',
            slug: 'why-ceylon-cinnamon-is-different',
            content: '# The Two Cinnamons\n\nMost cinnamon sold globally is **cassia** (*Cinnamomum cassia*), grown in China and Indonesia...',
            authorId: (await prisma.user.findUnique({ where: { email: 'admin@aranyaceylon.com' } }))!.id,
            tags: ['cinnamon', 'ceylon', 'spice-guide'],
            status: BlogStatus.PUBLISHED,
            publishedAt: new Date(),
            seoTitle: 'Ceylon vs Cassia Cinnamon: The Complete Guide',
            seoDesc: 'Discover why Ceylon true cinnamon is prized worldwide and how it differs from the cassia you find in supermarkets.',
        },
    });

    console.log('✅ Blog post created');
    console.log('\n🌿 Seed complete!');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });