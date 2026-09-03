import cron from 'node-cron';
import { prisma } from '../index.js';
import { sendLowStockAlert, sendAbandonedCartEmail } from '../services/email.service.js';
import { revalidateFrontend } from '../lib/revalidate.js';
import { cancelOrderAndReleaseStock } from '../controllers/webhook.controller.js';

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

            // P3-4: revalidate each newly published post so it appears immediately
            await Promise.all(
                due.flatMap((blog) => [
                    revalidateFrontend(`/journal/${blog.slug}`),
                    revalidateFrontend('/journal'),
                ]),
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

// --- Job 4: Cancel stale unpaid orders ---
// Runs hourly. Cancels orders stuck in PENDING for more than 24h — a failed or
// abandoned checkout. This is the real cancellation path now that the payment
// webhooks no longer cancel on a single failed attempt (#16), since the same
// PaymentIntent / PayHere order can be retried.
//
// Goes through cancelOrderAndReleaseStock (one order at a time, not a bulk
// updateMany) because each stale order reserved real stock at checkout-intent
// creation (roadmap: stock reservation at checkout) that must be released
// back — a bulk status flip would silently leak that stock forever. The
// per-order `status: 'PENDING'` guard inside it is still race-safe against a
// payment that completes in the gap between this query and the cancel call.
const STALE_ORDER_HOURS = 24;

export function startStaleOrderCancellationJob() {
    cron.schedule('0 * * * *', async () => {
        try {
            const cutoff = new Date(Date.now() - STALE_ORDER_HOURS * 60 * 60 * 1000);
            const stale = await prisma.order.findMany({
                where: { status: 'PENDING', createdAt: { lt: cutoff } },
                select: { id: true },
            });

            for (const o of stale) {
                await cancelOrderAndReleaseStock(o.id, `Cancelled — stale PENDING order older than ${STALE_ORDER_HOURS}h.`);
            }

            if (stale.length > 0) console.log(`🛒 Cancelled ${stale.length} stale unpaid order(s)`);
        } catch (err) {
            console.error('[CRON] Stale order cancellation job failed:', err);
        }
    });
}

// --- Job 5: Prune expired / used refresh tokens ---
// Runs daily at 3am. Tokens are removed on use or detected reuse, but lapsed
// sessions never trigger a delete, so the Token table grows unboundedly otherwise.
export function startTokenPruningJob() {
    cron.schedule('0 3 * * *', async () => {
        try {
            const { count } = await prisma.token.deleteMany({
                where: { expiresAt: { lt: new Date() } },
            });
            if (count > 0) console.log(`🔑 Pruned ${count} expired refresh token(s)`);
        } catch (err) {
            console.error('[CRON] Token pruning job failed:', err);
        }
    });
}

// --- Job 6: Abandoned-cart recovery ---
// Runs hourly (offset 30 past, so it doesn't pile onto every other job at the
// top of the hour). Emails a signed-in user whose cart has sat untouched for
// a few hours — guest carts are never targeted, since no email is captured
// before checkout, so there's nowhere to send a reminder. Sends at most once
// per abandonment episode: getOrCreateCart clears abandonedEmailSentAt on
// any cart activity, so a renewed-then-abandoned-again cart is eligible
// again once it's gone quiet for another full window.
const ABANDONED_CART_HOURS = 3;

// Extracted from the cron callback so the actual targeting/sending logic is
// directly unit-testable without faking node-cron.
export async function runAbandonedCartRecovery(): Promise<number> {
    const cutoff = new Date(Date.now() - ABANDONED_CART_HOURS * 60 * 60 * 1000);
    const carts = await prisma.cart.findMany({
        where: {
            userId: { not: null },
            updatedAt: { lt: cutoff },
            abandonedEmailSentAt: null,
            items: { some: {} },
        },
        include: {
            user: { select: { email: true } },
            items: { include: { product: { select: { name: true } } } },
        },
    });

    for (const cart of carts) {
        if (!cart.user?.email) continue;
        await sendAbandonedCartEmail({
            to: cart.user.email,
            items: cart.items.map((item) => ({ name: item.product.name, quantity: item.quantity })),
        }).catch((err) => console.error(`[CRON] Abandoned-cart email failed for cart ${cart.id}:`, err));
        await prisma.cart.update({ where: { id: cart.id }, data: { abandonedEmailSentAt: new Date() } });
    }

    return carts.length;
}

export function startAbandonedCartRecoveryJob() {
    cron.schedule('30 * * * *', async () => {
        try {
            const sent = await runAbandonedCartRecovery();
            if (sent > 0) console.log(`📧 Sent ${sent} abandoned-cart recovery email(s)`);
        } catch (err) {
            console.error('[CRON] Abandoned-cart recovery job failed:', err);
        }
    });
}

// Start all jobs
export function startAllJobs() {
    startScheduledPostsJob();
    startCartExpiryJob();
    startLowStockAlertJob();
    startStaleOrderCancellationJob();
    startTokenPruningJob();
    startAbandonedCartRecoveryJob();
    console.log('⏰ Cron jobs started');
}