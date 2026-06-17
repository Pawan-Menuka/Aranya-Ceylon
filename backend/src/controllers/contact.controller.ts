import type { Request, Response } from 'express';
import { z } from 'zod';

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
    const ref = `AC-${Date.now().toString(36).toUpperCase()}`;

    // TODO: send notification email to support inbox (e.g. via SendGrid/Resend)
    // For now, log to server so support can see incoming enquiries
    console.info('[contact]', { ref, name: data.name, email: data.email, subject: data.subject });

    return res.status(201).json({ ref, message: 'Your message has been received.' });
}
