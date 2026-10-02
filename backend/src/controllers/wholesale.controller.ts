import type { Request, Response } from 'express';
import { z } from 'zod';
import { sendSupportNotification } from '../services/email.service.js';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { outboxEnabled } from '../lib/outbox.js';
import { enqueueEmail } from '../services/email.service.js';

const wholesaleSchema = z.object({
    company: z.string().min(1),
    contact: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    country: z.string().min(1),
    type: z.string().min(1),
    volume: z.string().optional(),
    website: z.string().optional(),
    message: z.string().optional(),
    consent: z.boolean(),
});

export async function submitWholesale(req: Request, res: Response) {
    const data = wholesaleSchema.parse(req.body);

    if (!data.consent) {
        return res.status(400).json({ error: 'Consent is required.' });
    }

    const ref = `WS-${randomUUID().toUpperCase()}`;

    // Notify the wholesale/support inbox so leads aren't silently lost (BUG-10).
    const notify = () => sendSupportNotification({
            subject: `Wholesale application: ${data.company} (${ref})`,
            replyTo: data.email,
            fields: [
                ['Company', data.company],
                ['Contact', data.contact],
                ['Email', data.email],
                ['Phone', data.phone ?? '—'],
                ['Country', data.country],
                ['Type', data.type],
                ['Volume', data.volume ?? '—'],
                ['Website', data.website ?? '—'],
                ['Message', data.message ?? '—'],
            ],
    });
    if (outboxEnabled()) {
        await prisma.$transaction(tx => enqueueEmail(tx, `support:${ref}`, notify));
    } else {
        try { await notify(); } catch { console.error('[wholesale] notification failed', { ref }); }
    }

    return res.status(201).json({ ref, message: 'Your application has been received. We will be in touch within 3 business days.' });
}
