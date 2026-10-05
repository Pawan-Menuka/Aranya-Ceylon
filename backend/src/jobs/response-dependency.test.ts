import { afterEach, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

const send = vi.hoisted(() => vi.fn());
vi.mock('../services/email.service.js', () => ({ sendSupportNotification: send }));

import { submitContact } from '../controllers/contact.controller.js';
import { submitWholesale } from '../controllers/wholesale.controller.js';
import { revalidateFrontend } from '../lib/revalidate.js';

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

function response() {
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    };
    return res as unknown as Response & typeof res;
}

it.each([
    [submitContact, { name: 'Buyer', email: 'buyer@example.test', subject: 'Question', message: 'A detailed question', consent: true }],
    [submitWholesale, { company: 'Shop', contact: 'Buyer', email: 'buyer@example.test', country: 'Sri Lanka', type: 'Retail', consent: true }],
])('holds the submission response through an 80 ms synthetic provider wait', async (handler, body) => {
    vi.useFakeTimers();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    send.mockImplementation(() => new Promise<void>(resolve => setTimeout(resolve, 80)));
    const res = response();
    const work = handler({ body } as Request, res);
    await vi.advanceTimersByTimeAsync(79);
    expect(res.json).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await work;
    expect(res.status).toHaveBeenCalledWith(201);
});

it('holds a synthetic revalidation request through fetch and body consumption', async () => {
    vi.useFakeTimers();
    vi.stubEnv('REVALIDATION_SECRET', 'fixture-only');
    vi.stubEnv('FRONTEND_URL', 'http://fixture.local');
    const arrayBuffer = vi.fn(() => new Promise<ArrayBuffer>(resolve => setTimeout(() => resolve(new ArrayBuffer(0)), 20)));
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, arrayBuffer }), 80))));

    const work = revalidateFrontend(['/products']);
    await vi.advanceTimersByTimeAsync(79);
    expect(arrayBuffer).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(20);
    let done = false;
    void work.then(() => { done = true; });
    await Promise.resolve();
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await work;
    expect(arrayBuffer).toHaveBeenCalledOnce();
    expect(done).toBe(true);
});
