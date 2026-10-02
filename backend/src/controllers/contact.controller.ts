import type { Request, Response } from 'express';
import { z } from 'zod';
import { sendSupportNotification } from '../services/email.service.js';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { outboxEnabled } from '../lib/outbox.js';
import { enqueueEmail } from '../services/email.service.js';

const contactSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    order: z.string().optional(),
    subject: z.string().min(1),
    message: z.string().min(10),
    consent: z.boolean(),
});

export async function submitContact(req: Request, res: Response) {
    const data = contactSchema.parse(req.body);

    if (!data.consent) {
        return res.status(400).json({ error: 'Consent is required.' });
    }

    // Generate a reference number for the user to quote in follow-ups
    const ref = `AC-${randomUUID().toUpperCase()}`;

    // Notify the support inbox so enquiries aren't silently lost (BUG-10).
    // Best-effort — a mail failure must not lose the submission or 500 the user;
    // it's logged (and, with no RESEND key, degrades to a logged send).
    const notify = () => sendSupportNotification({
            subject: `Contact enquiry: ${data.subject} (${ref})`,
            replyTo: data.email,
            fields: [
                ['Name', data.name],
                ['Email', data.email],
                ['Order', data.order ?? '—'],
                ['Subject', data.subject],
                ['Message', data.message],
            ],
    });
    if (outboxEnabled()) {
        // Acknowledgement means the encrypted submission is durable, even during a provider outage.
        await prisma.$transaction(tx => enqueueEmail(tx, `support:${ref}`, notify));
    } else {
        try { await notify(); } catch { console.error('[contact] notification failed', { ref }); }
    }

    return res.status(201).json({ ref, message: 'Your message has been received.' });
}
