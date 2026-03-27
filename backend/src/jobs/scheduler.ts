import cron from 'node-cron';
import { prisma } from '../index.js';
import { sendLowStockAlert } from '../services/email.service.js';

// --- Job 1: Publish scheduled blog posts ---
// Runs every minute. Checks for posts where scheduledAt <= now
// and status is still SCHEDULED, then publishes them.
export function startScheduledPostsJob() {
    cron.schedule('* * * * *', async () => {
        try {
            const due = await prisma.blog.findMany({
                where: {
                    status: 'SCHEDULED',
                    scheduledAt: { lte: new Date() },
                },
            });

            if (due.length === 0) return;

            await Promise.all(
                due.map((blog) =>
                    prisma.blog.update({
                        where: { id: blog.id },
                        data: { status: 'PUBLISHED', publishedAt: new Date() },
                    }),
                ),
            );

            console.log(`📝 Published ${due.length} scheduled blog post(s)`);
        } catch (err) {
            console.error('[CRON] Scheduled posts job failed:', err);
        }
    });
}

// --- Job 2: Expire guest carts ---
// Runs every hour. Deletes guest carts older than 30 days
// to keep the Cart table clean.
export function startCartExpiryJob() {
    cron.schedule('0 * * * *', async () => {
        try {
            const { count } = await prisma.cart.deleteMany({
                where: {
                    userId: null,     // Guest carts only
                    expiresAt: { lte: new Date() },
                },
            });

            if (count > 0) console.log(`🗑️  Expired ${count} guest cart(s)`);
        } catch (err) {
            console.error('[CRON] Cart expiry job failed:', err);
        }
    });
}

// --- Job 3: Low stock alert ---
// Runs once a day at 8am. Emails admin if any variant
// is below the LOW_STOCK_THRESHOLD.
export function startLowStockAlertJob() {
    cron.schedule('0 8 * * *', async () => {
        try {
            const threshold = Number(process.env.LOW_STOCK_THRESHOLD ?? 10);

            const lowStock = await prisma.variant.findMany({
                where: { stock: { lte: threshold, gt: 0 } },
                include: { product: { select: { name: true } } },
            });

            if (lowStock.length === 0) return;

            await sendLowStockAlert(
                lowStock.map((v) => ({
                    name: v.product.name,
                    sku: v.sku,
                    stock: v.stock,
                })),
            );

            console.log(`📦 Low stock alert sent for ${lowStock.length} variant(s)`);
        } catch (err) {
            console.error('[CRON] Low stock alert job failed:', err);
        }
    });
}

// Start all jobs
export function startAllJobs() {
    startScheduledPostsJob();
    startCartExpiryJob();
    startLowStockAlertJob();
    console.log('⏰ Cron jobs started');
}