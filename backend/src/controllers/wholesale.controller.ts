import type { Request, Response } from 'express';
import { z } from 'zod';
import { sendSupportNotification, supportAddress } from '../services/email.service.js';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { outboxEnabled } from '../lib/outbox.js';
import { enqueueEmail } from '../services/email.service.js';

// Upper bounds (final audit #24): these are emailed verbatim to the support
// inbox and were otherwise limited only by the 512 KB request body.
const wholesaleSchema = z.object({
    company: z.string().min(1).max(200),
    contact: z.string().min(1).max(100),
    email: z.string().email().max(254),
    phone: z.string().max(30).optional(),
    country: z.string().min(1).max(100),
    type: z.string().min(1).max(100),
    volume: z.string().max(100).optional(),
    website: z.string().max(300).optional(),
    message: z.string().max(5000).optional(),
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
        // Without the durable outbox the email IS the submission — nothing is
        // stored. Telling the visitor it was received when the send failed
        // meant the enquiry was silently lost.
        try { await notify(); } catch {
            console.error('[wholesale] notification failed', { ref });
            return res.status(503).json({ error: `We couldn't send your application just now. Please try again in a few minutes, or email ${supportAddress()}.` });
        }
    }

    return res.status(201).json({ ref, message: 'Your application has been received. We will be in touch within 3 business days.' });
}
